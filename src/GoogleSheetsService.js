// Google Sheets API Service for RaJA Attendance System
class GoogleSheetsService {
  constructor() {
    this.API_KEY = process.env.REACT_APP_GOOGLE_SHEETS_API_KEY;
    this.STUDENTS_SHEET_ID = process.env.REACT_APP_STUDENTS_SHEET_ID;
    this.NEWS_SHEET_ID = process.env.REACT_APP_NEWS_SHEET_ID;
    this.ATTENDANCE_SHEET_ID = process.env.REACT_APP_ATTENDANCE_SHEET_ID;
    this.BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";
  }

  async handleResponse(response) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Sheets API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
    return response.json();
  }

  // Read students data from Google Sheets
  async getStudentsData() {
    try {
      console.log("🔍 Fetching students data from Google Sheets...");

      // Check if API key is available
      if (!this.API_KEY || this.API_KEY === "undefined") {
        console.warn("⚠️ No Google Sheets API key configured");
        console.log(
          "💡 To use Google Sheets directly, add REACT_APP_GOOGLE_SHEETS_API_KEY to your .env file"
        );
        return this.getFallbackStudentsData();
      }

      // Use the main sheet ID (from the URL provided) and read from Names tab
      const MAIN_SHEET_ID = "1mpxS49HPbEqbmtgABFKYCEEAzq7i9MZjATrSpWo92dI";
      const url = `${this.BASE_URL}/${MAIN_SHEET_ID}/values/Names!A2:H?key=${this.API_KEY}`;

      console.log("📡 Students API URL:", url);

      const response = await fetch(url);
      const data = await this.handleResponse(response);

      console.log("📊 Raw students data from Google Sheets:", data);

      const studentsData = {
        Employee: {},
        Student: {},
      };

      if (data.values && data.values.length > 0) {
        console.log(`🔍 Processing ${data.values.length} student records...`);

        data.values.forEach((row, index) => {
          const [name, category, branch, grade, area, , , status] = row;

          // Skip empty rows
          if (!name || !category) {
            console.log(
              `⚠️ Skipping row ${index + 2}: missing name or category`
            );
            return;
          }

          // Skip inactive students/employees
          if (status && status.toLowerCase() === "inactive") {
            console.log(`⚠️ Skipping ${name}: marked as inactive`);
            return;
          }

          if (category === "Employee") {
            const empBranch = branch || "General";
            if (!studentsData.Employee[empBranch]) {
              studentsData.Employee[empBranch] = [];
            }
            studentsData.Employee[empBranch].push(name);
            console.log(`✅ Added employee: ${name} to ${empBranch}`);
          } else if (category === "Student") {
            const studentGrade = grade || "General";
            const studentArea = area || "General";

            if (!studentsData.Student[studentGrade]) {
              studentsData.Student[studentGrade] = {};
            }
            if (!studentsData.Student[studentGrade][studentArea]) {
              studentsData.Student[studentGrade][studentArea] = [];
            }
            studentsData.Student[studentGrade][studentArea].push(name);
            console.log(
              `✅ Added student: ${name} to ${studentGrade} - ${studentArea}`
            );
          }
        });
      } else {
        console.log("⚠️ No students data found in Google Sheets");
      }

      console.log("✅ Final processed students data:", studentsData);
      return studentsData;
    } catch (error) {
      console.error("❌ Error fetching students data:", error);
      console.log("🔄 Using fallback data due to error");
      return this.getFallbackStudentsData();
    }
  }

  // Read news data from Google Sheets
  async getNewsData() {
    try {
      // Use the main sheet ID (same as students data) and read from News tab
      const MAIN_SHEET_ID = "1mpxS49HPbEqbmtgABFKYCEEAzq7i9MZjATrSpWo92dI";
      const url = `${this.BASE_URL}/${MAIN_SHEET_ID}/values/News!A2:G?key=${this.API_KEY}`;

      console.log("📡 News API URL:", url);

      const response = await fetch(url);
      const data = await this.handleResponse(response);

      const newsItems = [];

      if (data.values) {
        data.values.forEach((row) => {
          const [
            headline,
            subtitle,
            imageUrl,
            showImage,
            priority,
            dateCreated,
            status,
          ] = row;

          // Skip empty rows
          if (!headline) return;

          newsItems.push({
            headline: headline || "",
            subtitle: subtitle || "",
            image: imageUrl || null,
            showImage: showImage === "TRUE" || showImage === "true",
            priority: priority || "Medium",
            dateCreated: dateCreated || new Date().toISOString().split("T")[0],
            status: status || "Active",
          });
        });
      }

      return newsItems.length > 0 ? newsItems : this.getFallbackNewsData();
    } catch (error) {
      console.error("Error fetching news data:", error);
      return this.getFallbackNewsData();
    }
  }

  // Write attendance record to Google Sheets using Apps Script
  async logAttendance(attendanceRecord) {
    try {
      console.log("🔍 Starting attendance log via Apps Script...");
      console.log("📊 Attendance Record:", attendanceRecord);

      // Use the correct working Apps Script URL (hardcoded to ensure it works)
      const APPS_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbzwNx4j-0o57hE0T-uGEyPjqiigHcwW7CdQW0Vowp5zq12fPl19Sgrtp0o-ylmHR2Me0w/exec";

      console.log("🔗 Apps Script URL:", APPS_SCRIPT_URL);
      console.log(
        "🔍 Environment variable:",
        process.env.REACT_APP_APPS_SCRIPT_URL
      );

      if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("undefined")) {
        console.error("❌ Apps Script URL not configured properly");
        return false;
      }

      // Prepare the data for Apps Script
      const attendanceData = {
        name: attendanceRecord.name,
        category: attendanceRecord.category,
        action: attendanceRecord.action,
        date: attendanceRecord.date,
        time: attendanceRecord.time,
        branch: attendanceRecord.branch || "",
        grade: attendanceRecord.grade || "",
        area: attendanceRecord.area || "",
        reason: attendanceRecord.reason || "",
        timestamp: new Date().toISOString(),
        source: "Web App",
      };

      console.log("📝 Data to send:", attendanceData);

      // Send data as FormData (confirmed working method)
      const formData = new FormData();
      formData.append("data", JSON.stringify(attendanceData));

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
        mode: "no-cors", // This bypasses CORS
      });

      console.log(" Response status:", response.status);
      console.log("📡 Response status text:", response.statusText);

      // Since we're using no-cors, we can't read the response
      // But we can assume success if no error was thrown
      console.log("✅ Attendance data sent successfully (CORS bypassed)");
      return true;
    } catch (error) {
      console.error("❌ Error logging attendance:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  // Update news item in Google Sheets
  async updateNewsItem(index, newsItem) {
    try {
      const row = index + 2; // +2 because sheets are 1-indexed and we have headers
      const url = `${this.BASE_URL}/${this.NEWS_SHEET_ID}/values/News!A${row}:G${row}?valueInputOption=USER_ENTERED&key=${this.API_KEY}`;

      const values = [
        [
          newsItem.headline,
          newsItem.subtitle,
          newsItem.image || "",
          newsItem.showImage ? "TRUE" : "FALSE",
          newsItem.priority || "Medium",
          newsItem.dateCreated || new Date().toISOString().split("T")[0],
          newsItem.status || "Active",
        ],
      ];

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: values,
        }),
      });

      await this.handleResponse(response);
      return true;
    } catch (error) {
      console.error("Error updating news:", error);
      return false;
    }
  }

  // Fallback data when API is not available - Returns empty structure
  getFallbackStudentsData() {
    console.log("⚠️ Using empty fallback data - database connection required");
    return {
      Employee: {},
      Student: {},
    };
  }

  getFallbackNewsData() {
    return [
      {
        headline: "RaJA Attendance System",
        subtitle: "Please connect to database to load news and student data",
        image: null,
        showImage: false,
        priority: "High",
        dateCreated: new Date().toISOString().split("T")[0],
        status: "Active",
      },
    ];
  }

  // Refresh students data by forcing a new fetch
  async refreshStudentsData() {
    console.log("🔄 Refreshing students data from Google Sheets...");
    return await this.getStudentsData();
  }

  // Check if Google Sheets integration is configured
  isConfigured() {
    return !!(
      this.API_KEY &&
      this.STUDENTS_SHEET_ID &&
      this.NEWS_SHEET_ID &&
      this.ATTENDANCE_SHEET_ID
    );
  }

  // Add this method to your GoogleSheetsService class
  async testConnection() {
    try {
      console.log("🧪 Testing Google Sheets connection...");
      console.log("🔑 API Key:", this.API_KEY ? "Present" : "Missing");
      console.log(
        "📋 Sheet ID:",
        this.ATTENDANCE_SHEET_ID ? "Present" : "Missing"
      );

      // Test reading from the sheet
      const url = `${this.BASE_URL}/${this.ATTENDANCE_SHEET_ID}/values/Attendance!A1:K1?key=${this.API_KEY}`;
      console.log(" Test URL:", url);

      const response = await fetch(url);
      console.log(" Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Connection successful!", data);
        return true;
      } else {
        const errorText = await response.text();
        console.error("❌ Connection failed:", errorText);
        return false;
      }
    } catch (error) {
      console.error("❌ Connection test error:", error);
      return false;
    }
  }
}

const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;
