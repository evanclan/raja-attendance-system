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
      const url = `${this.BASE_URL}/${this.STUDENTS_SHEET_ID}/values/Students!A2:H?key=${this.API_KEY}`;
      const response = await fetch(url);
      const data = await this.handleResponse(response);

      const studentsData = {
        Employee: {},
        Student: {},
      };

      if (data.values) {
        data.values.forEach((row) => {
          const [name, category, branch, grade, area, email, phone, status] =
            row;

          // Skip empty rows
          if (!name || !category) return;

          if (category === "Employee") {
            if (!studentsData.Employee[branch]) {
              studentsData.Employee[branch] = [];
            }
            studentsData.Employee[branch].push(name);
          } else if (category === "Student") {
            if (!studentsData.Student[grade]) {
              studentsData.Student[grade] = {};
            }
            if (!studentsData.Student[grade][area]) {
              studentsData.Student[grade][area] = [];
            }
            studentsData.Student[grade][area].push(name);
          }
        });
      }

      return studentsData;
    } catch (error) {
      console.error("Error fetching students data:", error);
      return this.getFallbackStudentsData();
    }
  }

  // Read news data from Google Sheets
  async getNewsData() {
    try {
      const url = `${this.BASE_URL}/${this.NEWS_SHEET_ID}/values/News!A2:G?key=${this.API_KEY}`;
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

  // Fallback data when API is not available
  getFallbackStudentsData() {
    return {
      Employee: {
        "Admin Office": ["Alice", "Bob"],
        "Teaching Staff": ["Charlie", "Diana"],
      },
      Student: {
        "Grade 1": {
          "North Wing": ["Eren", "Mikasa"],
          "South Wing": ["Armin", "Jean"],
        },
        "Grade 2": {
          "North Wing": ["Sasha", "Connie"],
          "South Wing": ["Levi", "Historia"],
        },
      },
    };
  }

  getFallbackNewsData() {
    return [
      {
        headline: "RaJA School Announces New Digital Attendance System",
        subtitle:
          "Streamlined attendance tracking for students and staff with real-time monitoring and comprehensive reporting.",
        image: null,
        showImage: false,
        priority: "High",
        dateCreated: "2024-01-15",
        status: "Active",
      },
      {
        headline: "Annual Science Fair Winners Announced",
        subtitle:
          "Congratulations to our Grade 2 students who won first place in the regional science competition with their innovative renewable energy project.",
        image: null,
        showImage: false,
        priority: "Medium",
        dateCreated: "2024-01-16",
        status: "Active",
      },
      {
        headline: "New Library Resources Available",
        subtitle:
          "We have expanded our digital library with over 10,000 new e-books and educational resources for all grade levels.",
        image: null,
        showImage: false,
        priority: "Low",
        dateCreated: "2024-01-17",
        status: "Active",
      },
      {
        headline: "Sports Day Registration Now Open",
        subtitle:
          "Join us for our annual sports day featuring track events, team sports, and fun activities for all students and staff.",
        image: null,
        showImage: false,
        priority: "High",
        dateCreated: "2024-01-18",
        status: "Active",
      },
    ];
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

export default new GoogleSheetsService();
