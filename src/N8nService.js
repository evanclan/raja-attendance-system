/**
 * N8nService - Service for integrating with n8n workflows
 * Replaces Google Apps Script with more reliable n8n automation
 */

class N8nService {
  constructor() {
    // n8n webhook URLs - Updated with your actual n8n instance URL
    this.baseUrl =
      process.env.REACT_APP_N8N_WEBHOOK_URL ||
      "https://n8n.evanserv.com/webhook";
    this.attendanceEndpoint = `${this.baseUrl}/raja-attendance`;
    this.dataEndpoint = `${this.baseUrl}/raja-data`;
    this.studentsEndpoint = `${this.baseUrl}/raja-students`;

    // Request timeout settings
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second

    console.log("🔧 N8nService initialized");
    console.log("📡 Attendance endpoint:", this.attendanceEndpoint);
    console.log("📊 Data endpoint:", this.dataEndpoint);
    console.log("👥 Students endpoint:", this.studentsEndpoint);
  }

  /**
   * Check if n8n service is properly configured
   */
  isConfigured() {
    return (
      this.baseUrl && this.baseUrl !== "https://your-n8n-instance.com/webhook"
    );
  }

  /**
   * Create a timeout promise for fetch requests
   */
  createTimeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), ms);
    });
  }

  /**
   * Make HTTP request with timeout and retry logic
   */
  async makeRequest(url, options = {}, attempt = 1) {
    try {
      const fetchPromise = fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      });

      const timeoutPromise = this.createTimeoutPromise(this.timeout);
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Handle 409 (Conflict/Duplicate) responses specially
      if (response.status === 409) {
        const duplicateData = await response.json().catch(() => ({}));
        console.log("⚠️ Duplicate detected:", duplicateData);
        return {
          success: false,
          error: "Duplicate attendance",
          message: duplicateData.message || "You already logged in today",
          existingRecord: duplicateData.existingRecord,
          isDuplicate: true,
          statusCode: 409,
          ...duplicateData,
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `HTTP ${response.status}: ${errorData.message || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Request failed (attempt ${attempt}):`, error);

      // Retry logic
      if (attempt < this.retryAttempts && !error.message.includes("timeout")) {
        console.log(
          `🔄 Retrying in ${this.retryDelay}ms... (attempt ${attempt + 1}/${
            this.retryAttempts
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.makeRequest(url, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Log attendance to n8n workflow
   */
  async logAttendance(attendanceData) {
    if (!this.isConfigured()) {
      console.warn("⚠️ N8n service not configured, using fallback");
      return this.getFallbackAttendanceResponse(attendanceData);
    }

    try {
      console.log("🚀 Sending attendance to n8n:", attendanceData);

      // Validate required fields
      if (
        !attendanceData.name ||
        !attendanceData.category ||
        !attendanceData.action
      ) {
        throw new Error(
          "Missing required fields: name, category, and action are required"
        );
      }

      // Add server-side timestamp if not provided
      const payload = {
        ...attendanceData,
        timestamp: attendanceData.timestamp || new Date().toISOString(),
        date: attendanceData.date || new Date().toISOString().split("T")[0],
        time:
          attendanceData.time ||
          new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          }),
      };

      const result = await this.makeRequest(this.attendanceEndpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("✅ n8n attendance success:", result);

      // Check if it's the "Workflow was started" response
      if (result.message === "Workflow was started") {
        console.warn(
          "⚠️ Attendance workflow not configured properly - returns 'Workflow was started'"
        );
        return {
          success: false,
          error: "Workflow started but no response",
          message: "n8n attendance workflow needs configuration fix",
          method: "n8n-attendance-incomplete",
          originalResponse: result,
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message || "Attendance recorded successfully",
        method: "n8n-webhook",
      };
    } catch (error) {
      console.error("❌ n8n attendance error:", error);

      // Return structured error response
      return {
        success: false,
        error: error.message,
        message: this.getErrorMessage(error),
        method: "n8n-webhook-failed",
      };
    }
  }

  /**
   * Get students data from n8n workflow with retry mechanism
   */
  async getStudentsData(retryCount = 0) {
    if (!this.isConfigured()) {
      console.warn("⚠️ N8n service not configured, using fallback data");
      return {
        success: false,
        data: { Student: {}, Employee: {} },
        message: "N8n service not configured",
      };
    }

    try {
      console.log("👥 Fetching students data from n8n...");

      const result = await this.makeRequest(this.studentsEndpoint, {
        method: "GET",
      });

      console.log("✅ n8n students fetch success:", result);
      console.log(
        "🔍 Debug - Full result structure:",
        JSON.stringify(result, null, 2)
      );
      console.log("🔍 Debug - result.data:", result.data);
      console.log("🔍 Debug - result.data type:", typeof result.data);

      // Check if workflow is just starting
      if (result.message === "Workflow was started" && retryCount < 3) {
        console.log(
          `🔄 Workflow starting, retrying in 2 seconds... (attempt ${
            retryCount + 1
          }/3)`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.getStudentsData(retryCount + 1);
      }

      // Check multiple possible data structures
      let extractedData = null;

      // Try different possible data structures
      if (result.data && (result.data.Student || result.data.Employee)) {
        // Data is directly in result.data
        extractedData = result.data;
        console.log("✅ Found data structure: result.data");
      } else if (
        result.success &&
        result.data &&
        result.data.data &&
        (result.data.data.Student || result.data.data.Employee)
      ) {
        // Data is nested in result.data.data
        extractedData = result.data.data;
        console.log("✅ Found data structure: result.data.data");
      } else if (result.Student || result.Employee) {
        // Data is directly in result
        extractedData = result;
        console.log("✅ Found data structure: result");
      } else {
        // Try to extract from various nested structures
        console.log("🔍 Trying to extract from nested structures...");
        console.log("🔍 Keys in result:", Object.keys(result));
        if (result.data) {
          console.log("🔍 Keys in result.data:", Object.keys(result.data));
        }
      }

      if (extractedData && (extractedData.Student || extractedData.Employee)) {
        console.log("✅ Successfully extracted data:", extractedData);
        return {
          success: true,
          data: extractedData,
          timestamp: result.timestamp || new Date().toISOString(),
          method: "n8n-students-reader",
        };
      } else {
        // Handle workflow started but no data returned
        console.warn(
          "⚠️ N8n workflow started but returned no data structure:",
          result
        );
        console.warn("⚠️ Expected Student/Employee properties not found");

        // Provide specific error message based on the result
        let errorMessage = "Workflow started but no data returned";
        let userMessage =
          "N8n workflow is starting but may not have finished processing yet";

        if (result.message === "Workflow was started") {
          errorMessage = "Workflow not activated";
          userMessage = "Please activate your n8n workflow first";
        } else if (retryCount >= 3) {
          errorMessage = "Workflow timeout after retries";
          userMessage = "Workflow is taking too long to complete";
        }

        return {
          success: false,
          data: { Student: {}, Employee: {} },
          error: errorMessage,
          message: userMessage,
          method: "n8n-students-incomplete",
        };
      }
    } catch (error) {
      console.error("❌ n8n students fetch error:", error);

      return {
        success: false,
        data: { Student: {}, Employee: {} },
        error: error.message,
        message: this.getErrorMessage(error),
        method: "n8n-students-failed",
      };
    }
  }

  /**
   * Get data from n8n workflow (students, news, config)
   */
  async getData(dataType = "all") {
    if (!this.isConfigured()) {
      console.warn("⚠️ N8n service not configured, using fallback data");
      return this.getFallbackData();
    }

    try {
      console.log("📊 Fetching data from n8n:", dataType);

      const result = await this.makeRequest(
        `${this.dataEndpoint}?type=${dataType}`,
        {
          method: "GET",
        }
      );

      console.log("✅ n8n data fetch success");
      return {
        success: true,
        data: result.data,
        timestamp: result.timestamp,
      };
    } catch (error) {
      console.error("❌ n8n data fetch error:", error);

      // Return fallback data on error
      console.log("🔄 Using fallback data due to n8n error");
      return this.getFallbackData();
    }
  }

  /**
   * Test n8n connection
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "N8n service not configured",
        message: "Please set REACT_APP_N8N_WEBHOOK_URL in your .env file",
      };
    }

    try {
      console.log("🧪 Testing n8n connection...");

      const testData = {
        name: "Test User - n8n Connection",
        category: "Student",
        action: "present",
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("en-US", { hour12: false }),
        grade: "Test Grade",
        area: "Test Area",
        test: true,
        connection_test: true,
      };

      const result = await this.logAttendance(testData);

      if (result.success) {
        console.log("✅ n8n connection test successful");
        return {
          success: true,
          message: "n8n connection working properly",
          data: result.data,
          method: "n8n-webhook",
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error("❌ n8n connection test failed:", error);
      return {
        success: false,
        error: error.message,
        message: "n8n connection test failed",
      };
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.message.includes("timeout")) {
      return "Request timed out. Please check your internet connection and try again.";
    } else if (error.message.includes("network")) {
      return "Network error. Please check your connection and try again.";
    } else if (error.message.includes("404")) {
      return "n8n workflow not found. Please check the webhook URL configuration.";
    } else if (error.message.includes("500")) {
      return "Server error. Please try again later or contact support.";
    } else if (error.message.includes("Duplicate")) {
      return "This person has already been marked for today.";
    } else {
      return `Error: ${error.message}`;
    }
  }

  /**
   * Fallback attendance response when n8n is not available
   */
  getFallbackAttendanceResponse(attendanceData) {
    console.log("🔄 Using fallback attendance response");

    // Simulate successful response for demo purposes
    return {
      success: true,
      data: {
        name: attendanceData.name,
        action: attendanceData.action,
        timestamp: attendanceData.timestamp || new Date().toISOString(),
      },
      message: "Attendance recorded (offline mode)",
      method: "fallback-demo",
    };
  }

  /**
   * Fallback data when n8n is not available - Returns empty structure
   */
  getFallbackData() {
    console.log("🔄 Using empty fallback data - database connection required");

    return {
      success: true,
      data: {
        students: {
          Student: {},
          Employee: {},
        },
        news: [
          {
            id: 1,
            headline: "RaJA Attendance System",
            subtitle: "Please connect to database to load student data",
            image: "",
            date: new Date().toISOString().split("T")[0],
            active: true,
          },
        ],
        config: {
          school_name: "RaJA School",
          admin_email: "admin@rajaschool.edu",
          attendance_cutoff_time: "18:00",
          auto_mark_absent: true,
        },
      },
      timestamp: new Date().toISOString(),
      method: "fallback-data",
    };
  }

  /**
   * Get service status and configuration info
   */
  getServiceInfo() {
    return {
      configured: this.isConfigured(),
      baseUrl: this.baseUrl,
      endpoints: {
        attendance: this.attendanceEndpoint,
        data: this.dataEndpoint,
        students: this.studentsEndpoint,
      },
      settings: {
        timeout: this.timeout,
        retryAttempts: this.retryAttempts,
        retryDelay: this.retryDelay,
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    if (newConfig.baseUrl) {
      this.baseUrl = newConfig.baseUrl;
      this.attendanceEndpoint = `${this.baseUrl}/raja-attendance`;
      this.dataEndpoint = `${this.baseUrl}/raja-data`;
      this.studentsEndpoint = `${this.baseUrl}/raja-students`;
    }

    if (newConfig.timeout) this.timeout = newConfig.timeout;
    if (newConfig.retryAttempts) this.retryAttempts = newConfig.retryAttempts;
    if (newConfig.retryDelay) this.retryDelay = newConfig.retryDelay;

    console.log("🔧 N8nService configuration updated:", this.getServiceInfo());
  }
}

// Export singleton instance
const n8nService = new N8nService();
export default n8nService;
