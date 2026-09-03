

import argparse
import json
import os
import sys
import time
from datetime import datetime

from dateutil import parser as dateparser
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

PORTAL_URL = "https://6a7b9d04f77bd2cc11608ba5--flourishing-sprite-7ec68f.netlify.app/"

# Maps the on-page detail labels -> canonical field keys (matching the
# names used in script.js's VEHICLES array). Adjust the *values* on the
# right if your NetDrive Mongoose schema uses different field names.
LABEL_TO_KEY = {
    "Registration No": "registrationNo",
    "Make": "make",
    "Registration Date": "registrationDate",
    "Tax Payment": "taxPaymentDate",
    "Engine No": "engineNo",
    "Vehicle Model": "model",
    "Body Type": "bodyType",
    "Owner Name": "ownerName",
    "Model Year": "modelYear",
    "Seating Capacity": "seatingCapacity",
    "CPLC": "cplc",
    "Safe Custody": "safeCustody",
    "Horse Power": "horsePower",
    "Class of Vehicle": "classOfVehicle",
}

# Which fields must match for a listing to be approved. These match the
# "List a Vehicle" form: Make/Brand, Model Year, Registration Date, Owner Name.
# Registration No. is the lookup key itself, so it's implicitly checked
# (if it doesn't exist on the portal at all, the listing is auto-rejected).
# Tax Payment Status isn't included by default since the form collects a
# status (paid/unpaid) while the portal returns a date - different shape,
# reconcile that separately if you want it enforced.
DEFAULT_COMPARE_FIELDS = ["make", "modelYear", "registrationDate", "ownerName"]

# Fields that should be compared as dates rather than plain strings,
# since the form sends mm/dd/yyyy but the portal renders "16 Jun, 2007".
DATE_FIELDS = {"registrationDate", "taxPaymentDate"}


def build_driver(headless: bool = True):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1280,900")

    chromedriver_path = os.environ.get("CHROMEDRIVER_PATH")
    if chromedriver_path:
        service = Service(executable_path=chromedriver_path)
        return webdriver.Chrome(service=service, options=opts)
    return webdriver.Chrome(options=opts)


def scrape_vehicle(driver, reg_no: str, timeout: int = 10):
    """Loads the portal, searches reg_no, and returns a dict of scraped
    fields, or None if no record was found."""
    driver.get(PORTAL_URL)

    wait = WebDriverWait(driver, timeout)
    reg_input = wait.until(EC.presence_of_element_located((By.ID, "regNo")))
    reg_input.clear()
    reg_input.send_keys(reg_no)

    search_btn = driver.find_element(By.ID, "searchBtn")
    search_btn.click()

    # Either #detailView becomes visible (found) or #statusMsg shows an
    # error (not found). Wait for either.
    try:
        wait.until(
            lambda d: (
                not d.find_element(By.ID, "detailView").get_attribute("hidden")
                or not d.find_element(By.ID, "statusMsg").get_attribute("hidden")
            )
        )
    except TimeoutException:
        return None

    status_msg = driver.find_element(By.ID, "statusMsg")
    if not status_msg.get_attribute("hidden"):
        # "No record found for this registration number." case
        return None

    detail_items = driver.find_elements(By.CSS_SELECTOR, "#detailGrid .detail-item")
    scraped = {}
    for item in detail_items:
        label = item.find_element(By.CLASS_NAME, "detail-label").text.strip()
        value = item.find_element(By.CLASS_NAME, "detail-value").text.strip()
        key = LABEL_TO_KEY.get(label)
        if key:
            scraped[key] = value

    return scraped


def normalize(value):
    """Loose normalization so '2007' == 2007 == ' 2007 ', case-insensitive."""
    if value is None:
        return ""
    return str(value).strip().lower()


def normalize_date(value):
    """Parses any reasonable date string/format down to YYYY-MM-DD so
    'mm/dd/yyyy' from the form and '16 Jun, 2007' from the portal compare
    equal. Falls back to plain string normalization if parsing fails."""
    if value is None or value == "":
        return ""
    try:
        return dateparser.parse(str(value)).strftime("%Y-%m-%d")
    except (ValueError, OverflowError):
        return normalize(value)


def compare(scraped: dict, submitted: dict, fields: list):
    mismatches = []
    for field in fields:
        s_val = scraped.get(field)
        sub_val = submitted.get(field)
        if field in DATE_FIELDS:
            match = normalize_date(s_val) == normalize_date(sub_val)
        else:
            match = normalize(s_val) == normalize(sub_val)
        if not match:
            mismatches.append(
                {"field": field, "submitted": sub_val, "verified": s_val}
            )
    return mismatches


def main():
    parser = argparse.ArgumentParser(description="Verify a car listing against the demo registry portal.")
    parser.add_argument("--regNo", required=True, help="Registration number to search for")
    parser.add_argument("--listing", required=True, help="JSON string of the submitted listing fields")
    parser.add_argument(
        "--fields",
        default=",".join(DEFAULT_COMPARE_FIELDS),
        help="Comma-separated list of fields to compare (default: %(default)s)",
    )
    parser.add_argument("--no-headless", action="store_true", help="Run with a visible browser window (debugging)")
    args = parser.parse_args()

    try:
        submitted = json.loads(args.listing)
    except json.JSONDecodeError as e:
        print(json.dumps({"valid": False, "reason": f"Invalid --listing JSON: {e}"}))
        sys.exit(1)

    fields = [f.strip() for f in args.fields.split(",") if f.strip()]

    driver = build_driver(headless=not args.no_headless)
    try:
        scraped = scrape_vehicle(driver, args.regNo)
    finally:
        driver.quit()

    if scraped is None:
        print(json.dumps({
            "valid": False,
            "reason": "No record found for this registration number.",
            "regNo": args.regNo,
        }))
        sys.exit(1)

    mismatches = compare(scraped, submitted, fields)
    result = {
        "valid": len(mismatches) == 0,
        "regNo": args.regNo,
        "verified": scraped,
        "submitted": submitted,
        "mismatches": mismatches,
    }
    print(json.dumps(result))
    sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()