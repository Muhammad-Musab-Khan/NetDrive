import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import sys
import json

BUSTER_PATH = r'C:\Users\User\Desktop\buster'
PROFILE_PATH = r'C:\Users\User\Desktop\ChromeAutomationProfile'

def run_scraper(reg_number):
    options = uc.ChromeOptions()
    options.add_argument(f'--load-extension={BUSTER_PATH}')
    options.add_argument(f'--disable-extensions-except={BUSTER_PATH}')
    options.add_argument(f'--user-data-dir={PROFILE_PATH}')
    options.add_argument('--start-maximized')
    options.add_argument('--no-sandbox')

    driver = None
    try:
        driver = uc.Chrome(options=options, use_subprocess=True, version_main=147)
        wait = WebDriverWait(driver, 30)

        driver.get("https://www.excise.gos.pk/vehicle/vehicle_search")

        # Enter registration number
        reg_field = wait.until(EC.element_to_be_clickable((By.ID, "reg_no")))
        reg_field.clear()
        reg_field.send_keys(reg_number)

        # Click reCAPTCHA checkbox
        wait.until(EC.frame_to_be_available_and_switch_to_it((By.CSS_SELECTOR, "iframe[title='reCAPTCHA']")))
        wait.until(EC.element_to_be_clickable((By.ID, "recaptcha-anchor"))).click()
        driver.switch_to.default_content()
        time.sleep(3)

        # Try to solve audio challenge with Buster
        try:
            wait.until(EC.frame_to_be_available_and_switch_to_it(
                (By.XPATH, "//iframe[contains(@title, 'challenge')]")
            ))

            # Click audio button
            try:
                audio_btn = wait.until(EC.element_to_be_clickable((By.ID, "recaptcha-audio-button")))
                audio_btn.click()
                time.sleep(2)
            except:
                pass

            # Click Buster button
            solved = False
            for i in range(15):
                try:
                    buster_btn = driver.find_element(By.CLASS_NAME, "buster-solver-button")
                    driver.execute_script("arguments[0].click();", buster_btn)
                    time.sleep(15)
                    solved = True
                    break
                except:
                    time.sleep(1)

            driver.switch_to.default_content()

            if not solved:
                print(json.dumps({"success": False, "error": "CAPTCHA could not be solved"}))
                return

        except:
            # Captcha may have auto-passed
            driver.switch_to.default_content()

        # Click search button
        time.sleep(2)
        search_btn = wait.until(EC.presence_of_element_located((By.ID, "search_btn")))
        driver.execute_script("arguments[0].click();", search_btn)
        time.sleep(5)

        # Scrape results table
        result = {}
        try:
            rows = driver.find_elements(By.CSS_SELECTOR, "table tr")
            for row in rows:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) >= 2:
                    key = cells[0].text.strip().lower().replace(" ", "_").replace(".", "")
                    value = cells[1].text.strip()
                    result[key] = value
        except:
            pass

        if not result:
            print(json.dumps({"success": False, "error": "No results found for this registration number"}))
            return

        print(json.dumps({"success": True, "data": result}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    reg = sys.argv[1] if len(sys.argv) > 1 else "BDE-814"
    run_scraper(reg)