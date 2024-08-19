package com.myselenium.app;

import static org.junit.Assert.assertTrue;

import java.net.URL;
import java.time.Duration;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Parameters;
import org.testng.annotations.Test;

/* TODOs
 * i. use docker-compose include/merge for selenium services 
 * ii. dockerize maven
*/
public class MilaTest {
    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeClass
    @Parameters("browser")
    public void setup(String browser) {
        // Initialize the WebDriver based on the browser parameter
        if (browser.equalsIgnoreCase("chrome")) {
            ChromeOptions options = new ChromeOptions();
            options.addArguments("--remote-allow-origins=*");
            options.addArguments("--disable-dev-shm-usage");
            options.addArguments("--no-sandbox");
            try{
            driver = new RemoteWebDriver(new URL("http://localhost:4444/wd/hub"), options);
            //driver = new ChromeDriver(options); //local
            } catch(Exception e){
                e.printStackTrace();
            }
        }
        wait = new WebDriverWait(driver, Duration.ofSeconds(4));
    }

    /* 
     * User can load collectivo sign-in page
     * - RemoteWebDriver only: change DIRECTUS_URL to host.docker.internal
     * - RemoteWebDriver only: any further action into login page (i.e. perform actual login) will get connection refused
     */
    @Test
    public void isLoginPageAvailable() {
        driver.get("http://host.docker.internal:3000"); // or localhost if testing locally
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//h1[contains(text(), 'Sign in to your account')]")));
        assertTrue(driver.getTitle().equalsIgnoreCase("Sign in to collectivo"));
    }

    @AfterClass
    public void teardown() {
        // Disable condition to keep browser open
        /* if (driver != null) {
            driver.quit();
        } */
    }
}
