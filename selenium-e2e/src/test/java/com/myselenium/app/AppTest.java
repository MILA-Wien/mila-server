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

public class AppTest {
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
            //driver = new ChromeDriver(options);
            } catch(Exception e){
                e.printStackTrace();
            }
        }
        wait = new WebDriverWait(driver, Duration.ofSeconds(3));
    }

    /* 
     * only http://keycloak:8080 works
     * or via access via network e.g. -> http://192.168.0.199:3000/
     * 
     * all other services with `localhost:0000` will get connection refused
     * 
     */
    @Test
    public void testMethod1() {
        System.out.println("testMethod1");
        driver.get("http://keycloak:8080");
        assertTrue(driver.getTitle().equalsIgnoreCase("Welcome to Keycloak"));
    }

    @Test
    public void testMethod2() {
        System.out.println("Page title: " + driver.getTitle());
    }

    @AfterClass
    public void teardown() {
        // Quit the WebDriver
        /* if (driver != null) {
            driver.quit();
        } */
    }
}
