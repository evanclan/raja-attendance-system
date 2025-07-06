import React, { useState, useEffect } from "react";
import sheetsService from "./GoogleSheetsService";
import directTestService from "./DirectTestService";

function AttendanceApp() {
  // State for cascading dropdowns
  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState("");
  const [grade, setGrade] = useState("");
  const [area, setArea] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [message, setMessage] = useState("");

  // State for attendance log
  const [attendanceLog, setAttendanceLog] = useState([]);

  // State for admin dashboard
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  // State for data from Google Sheets
  const [attendanceData, setAttendanceData] = useState({});
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetsConnected, setSheetsConnected] = useState(false);

  // State for news management
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [newsImage, setNewsImage] = useState(null);
  const [newsImagePreview, setNewsImagePreview] = useState(null);
  const [showImage, setShowImage] = useState(false);

  // Admin credentials
  const ADMIN_PASSWORD = "admin123";

  // Test functions
  const runDirectTest = async () => {
    console.log("🚀 Starting direct Apps Script test...");
    const result = await directTestService.testAppsScript();
    console.log("📊 Test result:", result);

    if (result.success) {
      setMessage(`✅ Direct test SUCCESS! Method: ${result.method}`);
    } else {
      setMessage(`❌ Direct test failed: ${result.error || result.message}`);
    }
  };

  const runGoogleSheetsTest = async () => {
    console.log("🚀 Starting Google Sheets read test...");
    const result = await directTestService.testGoogleSheetsRead();
    console.log("📊 Read test result:", result);

    if (result.success) {
      setMessage(`✅ Google Sheets read SUCCESS!`);
    } else {
      setMessage(`❌ Google Sheets read failed: ${result.error}`);
    }
  };

  // Load data from Google Sheets on component mount
  useEffect(() => {
    loadDataFromSheets();
  }, []);

  const loadDataFromSheets = async () => {
    setLoading(true);
    try {
      if (sheetsService.isConfigured()) {
        const [studentsData, newsData] = await Promise.all([
          sheetsService.getStudentsData(),
          sheetsService.getNewsData(),
        ]);

        setAttendanceData(studentsData);
        setNewsItems(newsData);
        setSheetsConnected(true);
        console.log("✅ Connected to Google Sheets successfully");
      } else {
        // Use fallback data if not configured
        setAttendanceData(sheetsService.getFallbackStudentsData());
        setNewsItems(sheetsService.getFallbackNewsData());
        setSheetsConnected(false);
        console.log("⚠️ Google Sheets not configured, using fallback data");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setAttendanceData(sheetsService.getFallbackStudentsData());
      setNewsItems(sheetsService.getFallbackNewsData());
      setSheetsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Get current time in HH:MM format
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle category change
  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setBranch("");
    setGrade("");
    setArea("");
    setSelectedName("");
    setMessage("");
  };

  // Handle branch change (for employees)
  const handleBranchChange = (newBranch) => {
    setBranch(newBranch);
    setSelectedName("");
    setMessage("");
  };

  // Handle grade change (for students)
  const handleGradeChange = (newGrade) => {
    setGrade(newGrade);
    setArea("");
    setSelectedName("");
    setMessage("");
  };

  // Handle area change (for students)
  const handleAreaChange = (newArea) => {
    setArea(newArea);
    setSelectedName("");
    setMessage("");
  };

  // Get available names based on selections
  const getAvailableNames = () => {
    if (category === "Employee" && branch && attendanceData.Employee) {
      return attendanceData.Employee[branch] || [];
    } else if (
      category === "Student" &&
      grade &&
      area &&
      attendanceData.Student
    ) {
      return attendanceData.Student[grade]?.[area] || [];
    }
    return [];
  };

  // Handle attendance action
  const handleAttendance = async (action) => {
    if (!selectedName) {
      setMessage("Please select a name first.");
      return;
    }

    const currentDate = getTodayDate();

    // Check if this person already has an entry for today
    const existingEntry = attendanceLog.find(
      (entry) => entry.name === selectedName && entry.date === currentDate
    );

    if (existingEntry) {
      setMessage(
        `${selectedName} already has an entry for today (${existingEntry.action} at ${existingEntry.time}).`
      );
      return;
    }

    const timestamp = new Date().toISOString();
    const currentTime = getCurrentTime();

    const payload = {
      name: selectedName,
      category,
      action,
      timestamp,
      time: currentTime,
      date: currentDate,
      ...(category === "Employee" && { branch }),
      ...(category === "Student" && { grade, area }),
    };

    // Add to attendance log
    const newLogEntry = {
      id: Date.now(),
      ...payload,
    };

    setAttendanceLog((prevLog) => [newLogEntry, ...prevLog]);

    // Log to Google Sheets if connected
    if (sheetsService.isConfigured()) {
      const success = await sheetsService.logAttendance(payload);
      if (success) {
        console.log("✅ Attendance logged to Google Sheets");
      } else {
        console.log("❌ Failed to log to Google Sheets");
      }
    }

    setMessage(`Successfully marked ${selectedName} as ${action}!`);

    // Reset name selection after successful action
    setTimeout(() => {
      setSelectedName("");
      setMessage("");
    }, 2000);
  };

  // Clear today's log
  const clearTodayLog = () => {
    setAttendanceLog([]);
  };

  // Get today's log entries
  const getTodayLog = () => {
    const today = getTodayDate();
    return attendanceLog.filter((entry) => entry.date === today);
  };

  // Admin authentication
  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminAuth(true);
      setAdminMessage("");
      setAdminPassword("");
    } else {
      setAdminMessage("Incorrect password. Please try again.");
    }
  };

  // Mark someone as absent (admin function)
  const markAbsent = async (
    name,
    category,
    branch,
    grade,
    area,
    reason = ""
  ) => {
    const currentDate = getTodayDate();
    const currentTime = getCurrentTime();

    // Check if already marked absent
    const existingAbsent = attendanceLog.find(
      (entry) =>
        entry.name === name &&
        entry.date === currentDate &&
        entry.action === "absent"
    );

    if (existingAbsent) {
      setAdminMessage(`${name} is already marked as absent for today.`);
      return;
    }

    const newAbsentEntry = {
      id: Date.now(),
      name,
      category,
      action: "absent",
      timestamp: new Date().toISOString(),
      time: currentTime,
      date: currentDate,
      reason,
      ...(category === "Employee" && { branch }),
      ...(category === "Student" && { grade, area }),
    };

    setAttendanceLog((prevLog) => [newAbsentEntry, ...prevLog]);

    // Log to Google Sheets if connected
    if (sheetsService.isConfigured()) {
      const success = await sheetsService.logAttendance(newAbsentEntry);
      if (success) {
        console.log("✅ Absence logged to Google Sheets");
      }
    }

    setAdminMessage(`Successfully marked ${name} as absent.`);

    setTimeout(() => {
      setAdminMessage("");
    }, 2000);
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewsImage(e.target.result);
        setNewsImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const removeImage = () => {
    setNewsImage(null);
    setNewsImagePreview(null);
  };

  // Update news
  const updateNews = async () => {
    const currentNews = getCurrentNews();
    currentNews.image = newsImage;
    currentNews.showImage = showImage;

    const updatedNewsItems = [...newsItems];
    updatedNewsItems[currentNewsIndex] = currentNews;
    setNewsItems(updatedNewsItems);

    // Update in Google Sheets if connected
    if (sheetsService.isConfigured()) {
      const success = await sheetsService.updateNewsItem(
        currentNewsIndex,
        currentNews
      );
      if (success) {
        setAdminMessage("News updated successfully in Google Sheets!");
      } else {
        setAdminMessage("Failed to update news in Google Sheets.");
      }
    } else {
      setAdminMessage("News updated locally (Google Sheets not connected).");
    }

    setTimeout(() => {
      setAdminMessage("");
    }, 2000);
  };

  // Update headline and subtitle
  const updateHeadline = (newHeadline) => {
    const updatedNewsItems = [...newsItems];
    updatedNewsItems[currentNewsIndex].headline = newHeadline;
    setNewsItems(updatedNewsItems);
  };

  const updateSubtitle = (newSubtitle) => {
    const updatedNewsItems = [...newsItems];
    updatedNewsItems[currentNewsIndex].subtitle = newSubtitle;
    setNewsItems(updatedNewsItems);
  };

  // News navigation
  const nextNews = () => {
    setCurrentNewsIndex((prevIndex) =>
      prevIndex === newsItems.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevNews = () => {
    setCurrentNewsIndex((prevIndex) =>
      prevIndex === 0 ? newsItems.length - 1 : prevIndex - 1
    );
  };

  const goToNews = (index) => {
    setCurrentNewsIndex(index);
  };

  // Get current news data
  const getCurrentNews = () => {
    return newsItems[currentNewsIndex];
  };

  // Get all people for admin absence marking
  const getAllPeople = () => {
    const people = [];

    // Add employees
    if (attendanceData.Employee) {
      Object.keys(attendanceData.Employee).forEach((branch) => {
        if (attendanceData.Employee[branch]) {
          attendanceData.Employee[branch].forEach((name) => {
            people.push({
              name,
              category: "Employee",
              branch,
              grade: null,
              area: null,
            });
          });
        }
      });
    }

    // Add students
    if (attendanceData.Student) {
      Object.keys(attendanceData.Student).forEach((grade) => {
        if (attendanceData.Student[grade]) {
          Object.keys(attendanceData.Student[grade]).forEach((area) => {
            if (attendanceData.Student[grade][area]) {
              attendanceData.Student[grade][area].forEach((name) => {
                people.push({
                  name,
                  category: "Student",
                  branch: null,
                  grade,
                  area,
                });
              });
            }
          });
        }
      });
    }

    return people;
  };

  const availableNames = getAvailableNames();
  const todayLog = getTodayLog();
  const allPeople = getAllPeople();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#2c3e50",
        }}
      >
        Loading data from Google Sheets...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fa",
        fontFamily: "Segoe UI, Arial, sans-serif",
        padding: "20px",
      }}
    >
      {/* Connection Status */}
      {sheetsService.isConfigured() && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "20px",
            zIndex: 1000,
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "600",
            backgroundColor: sheetsConnected ? "#d4edda" : "#f8d7da",
            color: sheetsConnected ? "#155724" : "#721c24",
            border: `1px solid ${sheetsConnected ? "#c3e6cb" : "#f5c6cb"}`,
          }}
        >
          {sheetsConnected
            ? "✅ Google Sheets Connected"
            : "❌ Google Sheets Offline"}
        </div>
      )}

      {/* Admin Access Button */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <button
          onClick={() => setAdminOpen(true)}
          style={{
            padding: "10px 15px",
            backgroundColor: "#2c3e50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#34495e")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#2c3e50")}
        >
          🔐 Admin
        </button>

        {/* Test Buttons */}
        <button
          onClick={runDirectTest}
          style={{
            padding: "8px 12px",
            backgroundColor: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          🧪 Test Apps Script
        </button>

        <button
          onClick={runGoogleSheetsTest}
          style={{
            padding: "8px 12px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          📊 Test Sheets Read
        </button>
      </div>

      {/* News Headline Section */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto 20px auto",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* News Navigation */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "10px",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        >
          <button
            onClick={prevNews}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              color: "white",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) =>
              (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.3)")
            }
            onMouseOut={(e) =>
              (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
            }
          >
            ‹
          </button>
        </div>

        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "10px",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        >
          <button
            onClick={nextNews}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              color: "white",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) =>
              (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.3)")
            }
            onMouseOut={(e) =>
              (e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)")
            }
          >
            ›
          </button>
        </div>

        {/* News Content */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 5 }}>
          <h2
            style={{
              fontSize: "1.8rem",
              marginBottom: "10px",
              fontWeight: "600",
            }}
          >
            {getCurrentNews().headline}
          </h2>
          <p
            style={{
              fontSize: "1rem",
              opacity: "0.9",
              lineHeight: "1.5",
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            {getCurrentNews().subtitle}
          </p>
        </div>

        {/* News Indicators */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "8px",
          }}
        >
          {newsItems.map((_, index) => (
            <button
              key={index}
              onClick={() => goToNews(index)}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                border: "none",
                backgroundColor:
                  index === currentNewsIndex
                    ? "white"
                    : "rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            />
          ))}
        </div>

        {/* News Counter */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            fontSize: "12px",
            opacity: "0.7",
            background: "rgba(0, 0, 0, 0.2)",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          {currentNewsIndex + 1} / {newsItems.length}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "20px",
          maxWidth: "1200px",
          margin: "0 auto",
          alignItems: "flex-start",
        }}
      >
        {/* Main Attendance Form */}
        <div
          style={{
            flex: "1",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            padding: "30px",
            marginTop: "20px",
          }}
        >
          <h1
            style={{
              textAlign: "center",
              color: "#2c3e50",
              marginBottom: "30px",
              fontSize: "1.5rem",
            }}
          >
            RaJA Attendance System
          </h1>

          {/* Category Dropdown */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
                color: "#34495e",
              }}
            >
              Category
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "2px solid #e9ecef",
                fontSize: "16px",
                backgroundColor: "white",
              }}
            >
              <option value="">Select Category</option>
              <option value="Employee">Employee</option>
              <option value="Student">Student</option>
            </select>
          </div>

          {/* Employee Branch Dropdown */}
          {category === "Employee" && (
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#34495e",
                }}
              >
                Employee Branch
              </label>
              <select
                value={branch}
                onChange={(e) => handleBranchChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "2px solid #e9ecef",
                  fontSize: "16px",
                  backgroundColor: "white",
                }}
              >
                <option value="">Select Branch</option>
                {Object.keys(attendanceData.Employee).map((branchName) => (
                  <option key={branchName} value={branchName}>
                    {branchName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Grade Dropdown */}
          {category === "Student" && (
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#34495e",
                }}
              >
                Student Grade/Category
              </label>
              <select
                value={grade}
                onChange={(e) => handleGradeChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "2px solid #e9ecef",
                  fontSize: "16px",
                  backgroundColor: "white",
                }}
              >
                <option value="">Select Grade</option>
                {Object.keys(attendanceData.Student).map((gradeName) => (
                  <option key={gradeName} value={gradeName}>
                    {gradeName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Area Dropdown */}
          {category === "Student" && grade && (
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#34495e",
                }}
              >
                Student Area
              </label>
              <select
                value={area}
                onChange={(e) => handleAreaChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "2px solid #e9ecef",
                  fontSize: "16px",
                  backgroundColor: "white",
                }}
              >
                <option value="">Select Area</option>
                {Object.keys(attendanceData.Student[grade] || {}).map(
                  (areaName) => (
                    <option key={areaName} value={areaName}>
                      {areaName}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* Name Selection */}
          {availableNames.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#34495e",
                }}
              >
                Select Name
              </label>
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "2px solid #e9ecef",
                  fontSize: "16px",
                  backgroundColor: "white",
                }}
              >
                <option value="">Select Name</option>
                {availableNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Attendance Buttons */}
          {selectedName && (
            <div
              style={{
                display: "flex",
                gap: "15px",
                marginBottom: "20px",
              }}
            >
              <button
                onClick={() => handleAttendance("login")}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#27ae60",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.target.style.backgroundColor = "#229954")
                }
                onMouseOut={(e) => (e.target.style.backgroundColor = "#27ae60")}
              >
                Login
              </button>
              <button
                onClick={() => handleAttendance("logout")}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#e74c3c",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.target.style.backgroundColor = "#c0392b")
                }
                onMouseOut={(e) => (e.target.style.backgroundColor = "#e74c3c")}
              >
                Logout
              </button>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "#d4edda",
                color: "#155724",
                border: "1px solid #c3e6cb",
                textAlign: "center",
                fontSize: "16px",
              }}
            >
              {message}
            </div>
          )}

          {/* Current Selection Display */}
          {category && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: "#495057" }}>
                Current Selection:
              </h3>
              <p style={{ margin: "5px 0", color: "#6c757d" }}>
                <strong>Category:</strong> {category}
              </p>
              {category === "Employee" && branch && (
                <p style={{ margin: "5px 0", color: "#6c757d" }}>
                  <strong>Branch:</strong> {branch}
                </p>
              )}
              {category === "Student" && grade && (
                <p style={{ margin: "5px 0", color: "#6c757d" }}>
                  <strong>Grade:</strong> {grade}
                </p>
              )}
              {category === "Student" && area && (
                <p style={{ margin: "5px 0", color: "#6c757d" }}>
                  <strong>Area:</strong> {area}
                </p>
              )}
              {selectedName && (
                <p style={{ margin: "5px 0", color: "#6c757d" }}>
                  <strong>Selected Name:</strong> {selectedName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Attendance Log Sidebar */}
        <div
          style={{
            width: "400px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            padding: "20px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              borderBottom: "2px solid #e9ecef",
              paddingBottom: "10px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#2c3e50",
                fontSize: "1.5rem",
              }}
            >
              Today's Log
            </h2>
            <button
              onClick={clearTodayLog}
              style={{
                padding: "6px 12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>

          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {todayLog.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "#6c757d",
                  fontStyle: "italic",
                }}
              >
                No attendance records for today
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {todayLog.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "12px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                      border: "1px solid #e9ecef",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "5px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#2c3e50",
                            fontSize: "14px",
                          }}
                        >
                          {entry.name}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6c757d",
                          }}
                        >
                          {entry.time}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor:
                            entry.action === "login"
                              ? "#28a745"
                              : entry.action === "logout"
                              ? "#dc3545"
                              : "#ffc107",
                          color:
                            entry.action === "absent" ? "#212529" : "white",
                          fontWeight: "500",
                        }}
                      >
                        {entry.action.toUpperCase()}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#495057",
                      }}
                    >
                      {entry.category}
                      {entry.branch && ` - ${entry.branch}`}
                      {entry.grade && ` - ${entry.grade}`}
                      {entry.area && ` - ${entry.area}`}
                    </div>
                    {entry.reason && (
                      <div
                        style={{
                          marginTop: "5px",
                          fontSize: "11px",
                          color: "#6c757d",
                          fontStyle: "italic",
                        }}
                      >
                        Reason: {entry.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Log Summary */}
          {todayLog.length > 0 && (
            <div
              style={{
                marginTop: "15px",
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                border: "1px solid #e9ecef",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#6c757d",
                }}
              >
                <span>Total Records: {todayLog.length}</span>
                <span>
                  Logins:{" "}
                  {todayLog.filter((entry) => entry.action === "login").length}{" "}
                  | Logouts:{" "}
                  {todayLog.filter((entry) => entry.action === "logout").length}{" "}
                  | Absent:{" "}
                  {todayLog.filter((entry) => entry.action === "absent").length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Dashboard Modal */}
      {adminOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "30px",
                borderBottom: "2px solid #e9ecef",
                paddingBottom: "15px",
              }}
            >
              <h2 style={{ margin: 0, color: "#2c3e50" }}>Admin Dashboard</h2>
              <button
                onClick={() => {
                  setAdminOpen(false);
                  setAdminAuth(false);
                  setAdminPassword("");
                  setAdminMessage("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6c757d",
                }}
              >
                ×
              </button>
            </div>

            {!adminAuth ? (
              <div>
                <h3 style={{ marginBottom: "20px", color: "#495057" }}>
                  Admin Authentication
                </h3>
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "600",
                      color: "#34495e",
                    }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    placeholder="Enter admin password"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "2px solid #e9ecef",
                      fontSize: "16px",
                    }}
                  />
                </div>
                <button
                  onClick={handleAdminLogin}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#2c3e50",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Login to Admin Panel
                </button>

                {adminMessage && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "12px",
                      borderRadius: "8px",
                      backgroundColor: "#f8d7da",
                      color: "#721c24",
                      border: "1px solid #f5c6cb",
                      textAlign: "center",
                    }}
                  >
                    {adminMessage}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    marginBottom: "30px",
                  }}
                >
                  <button
                    onClick={() => setCurrentNewsIndex(0)}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    📰 News Management
                  </button>
                  <button
                    onClick={() => setCurrentNewsIndex(1)}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    📊 Data Management
                  </button>
                </div>

                {/* News Management Section */}
                <div>
                  <h3 style={{ marginBottom: "20px", color: "#495057" }}>
                    📰 News Management
                  </h3>
                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                        color: "#34495e",
                      }}
                    >
                      Headline
                    </label>
                    <input
                      type="text"
                      value={getCurrentNews().headline}
                      onChange={(e) => updateHeadline(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "2px solid #e9ecef",
                        fontSize: "16px",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                        color: "#34495e",
                      }}
                    >
                      Subtitle
                    </label>
                    <textarea
                      value={getCurrentNews().subtitle}
                      onChange={(e) => updateSubtitle(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        border: "2px solid #e9ecef",
                        fontSize: "16px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceApp;
