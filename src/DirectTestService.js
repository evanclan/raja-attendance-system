// Direct test service to verify Apps Script connectivity
class DirectTestService {
  async testAppsScript() {
    try {
      // Updated Apps Script URL for testing
      const APPS_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbzwNx4j-0o57hE0T-uGEyPjqiigHcwW7CdQW0Vowp5zq12fPl19Sgrtp0o-ylmHR2Me0w/exec";

      console.log("🧪 Testing direct Apps Script connection...");
      console.log("🔗 URL:", APPS_SCRIPT_URL);

      // Simple test data
      const testData = {
        name: "Direct Test User",
        category: "Employee",
        action: "test",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        }),
        branch: "Test Branch",
        grade: "",
        area: "",
        reason: "Direct test",
        timestamp: new Date().toISOString(),
        source: "Direct Test",
      };

      console.log("📝 Test data:", testData);

      // Method 1: Try with JSON
      console.log("🔄 Attempting Method 1: JSON with CORS");
      try {
        const response1 = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testData),
        });

        if (response1.ok) {
          const result1 = await response1.text();
          console.log("✅ Method 1 SUCCESS:", result1);
          return { success: true, method: "JSON with CORS", result: result1 };
        } else {
          console.log(
            "❌ Method 1 failed:",
            response1.status,
            response1.statusText
          );
        }
      } catch (error) {
        console.log("❌ Method 1 error:", error.message);
      }

      // Method 2: Try with FormData
      console.log("🔄 Attempting Method 2: FormData");
      try {
        const formData = new FormData();
        formData.append("data", JSON.stringify(testData));

        const response2 = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: formData,
        });

        if (response2.ok) {
          const result2 = await response2.text();
          console.log("✅ Method 2 SUCCESS:", result2);
          return { success: true, method: "FormData", result: result2 };
        } else {
          console.log(
            "❌ Method 2 failed:",
            response2.status,
            response2.statusText
          );
        }
      } catch (error) {
        console.log("❌ Method 2 error:", error.message);
      }

      // Method 3: Try with URL encoded
      console.log("🔄 Attempting Method 3: URL Encoded");
      try {
        const params = new URLSearchParams();
        params.append("data", JSON.stringify(testData));

        const response3 = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });

        if (response3.ok) {
          const result3 = await response3.text();
          console.log("✅ Method 3 SUCCESS:", result3);
          return { success: true, method: "URL Encoded", result: result3 };
        } else {
          console.log(
            "❌ Method 3 failed:",
            response3.status,
            response3.statusText
          );
        }
      } catch (error) {
        console.log("❌ Method 3 error:", error.message);
      }

      // Method 4: Try GET request to test basic connectivity
      console.log("🔄 Attempting Method 4: GET request");
      try {
        const response4 = await fetch(APPS_SCRIPT_URL, {
          method: "GET",
        });

        if (response4.ok) {
          const result4 = await response4.text();
          console.log("✅ Method 4 (GET) SUCCESS:", result4);
          return { success: true, method: "GET", result: result4 };
        } else {
          console.log(
            "❌ Method 4 failed:",
            response4.status,
            response4.statusText
          );
        }
      } catch (error) {
        console.log("❌ Method 4 error:", error.message);
      }

      console.log("❌ All methods failed");
      return { success: false, message: "All connection methods failed" };
    } catch (error) {
      console.error("❌ Direct test error:", error);
      return { success: false, error: error.message };
    }
  }

  // Test if we can read from Google Sheets directly
  async testGoogleSheetsRead() {
    try {
      const API_KEY = "AIzaSyDdk75gMkJUY7K8YNQ_-KhK3gJvrv99pFQ";
      const SHEET_ID = "1mpxS49HPbEqbmtgABFKYCEEAzq7i9MZjATrSpWo92dI";

      console.log("🧪 Testing Google Sheets read access...");

      // Try to read the Attendance sheet headers
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Attendance!A1:K1?key=${API_KEY}`;
      console.log("🔗 Read URL:", url);

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Google Sheets read SUCCESS:", data);
        return { success: true, data };
      } else {
        const errorText = await response.text();
        console.log(
          "❌ Google Sheets read failed:",
          response.status,
          errorText
        );
        return { success: false, error: errorText };
      }
    } catch (error) {
      console.error("❌ Google Sheets read error:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new DirectTestService();
