// middleware/verifyVehicleListing.js
//
// Runs demo_portal_scraper.py against the submitted "List a Vehicle" form
// data. If the registration number doesn't exist on the registry, or any
// checked field doesn't match, the listing is rejected with a 422 and the
// mismatches are sent back. Response shape (msg/errors) matches the rest
// of vehicles.js so ListVehicle.js's existing error handling works as-is.

const { execFile } = require("child_process");
const path = require("path");

// backend/scripts/demo_portal_scraper.py, relative to this file in backend/middleware/
const SCRAPER_PATH = path.join(__dirname, "..", "scripts", "demo_portal_scraper.py");
// Windows installs usually only register "python" on PATH, not "python3".
// Override with PYTHON_BIN in your .env if your setup differs.
const PYTHON_BIN = process.env.PYTHON_BIN || "python";

function runScraper(regNo, listingFields) {
  return new Promise((resolve, reject) => {
    const args = [
      SCRAPER_PATH,
      "--regNo",
      regNo,
      "--listing",
      JSON.stringify(listingFields),
    ];

    execFile(
      PYTHON_BIN,
      args,
      { timeout: 60000 }, // headless Chrome + page load, give it room
      (error, stdout, stderr) => {
        // The script exits 1 on a normal "rejected" verdict, not just on a
        // crash - so always try to parse stdout before treating this as
        // a hard failure.
        let parsed;
        try {
          parsed = JSON.parse(stdout.trim());
        } catch (parseErr) {
          return reject(
            new Error(`Verification script produced no usable output. exec_err: ${error}, stderr: ${stderr}, stdout: ${stdout}`)
          );
        }
        resolve(parsed);
      }
    );
  });
}

/**
 * Express middleware for POST /api/vehicles/list.
 * Reads the form's snake_case fields off req.body, verifies them against
 * the registry portal, and either calls next() or responds 422/502 directly.
 */
async function verifyVehicleListing(req, res, next) {
  const { make, model_year, registration_no, registration_date, owner_name } = req.body;

  if (!registration_no) {
    return res.status(400).json({ msg: 'Registration No. is required.' });
  }

  try {
    const result = await runScraper(registration_no, {
      make,
      modelYear: model_year,
      registrationDate: registration_date,
      ownerName: owner_name,
    });

    if (!result.valid) {
      const errors = result.mismatches && result.mismatches.length
        ? result.mismatches.map(
            (m) => `${m.field}: you entered "${m.submitted}", registry shows "${m.verified}"`
          )
        : [];

      return res.status(422).json({
        msg: result.reason || 'Vehicle details could not be verified against the registry.',
        errors,
      });
    }

    req.verifiedVehicle = result.verified;
    return next();
  } catch (err) {
    console.error('Vehicle verification failed:', err);
    return res.status(502).json({
      msg: 'Vehicle verification service is currently unavailable. Please try again.',
    });
  }
}

module.exports = { verifyVehicleListing };