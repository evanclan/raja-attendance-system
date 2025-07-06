import React, { useState, useEffect } from "react";
import sheetsService from "./GoogleSheetsService";
import n8nService from "./N8nService";

// This will be populated from the database
const EMPTY_DATA = {
  Employee: {},
  Student: {},
};

// Sample data for demonstration (remove when database is connected)
const SAMPLE_DATA = {
  Employee: {
    Administration: ["John Smith", "Sarah Johnson"],
    Teaching: ["Emily Davis", "David Brown"],
    Support: ["James Miller", "Anna Taylor"],
  },
  Student: {
    "Grade 1": {
      "Section A": ["Alice Walker", "Bob Chen"],
      "Section B": ["David Kim", "Eva Rodriguez"],
    },
    "Grade 2": {
      "Section A": ["Grace Liu", "Henry Wilson"],
      "Section B": ["Jack Davis", "Kate Brown"],
    },
  },
};

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
  const [activeAdminTab, setActiveAdminTab] = useState("news");

  // State for local student management
  const [localStudents, setLocalStudents] = useState({
    Student: {},
  });
  const [newStudentForm, setNewStudentForm] = useState({
    grade: "",
    area: "",
    name: "",
  });

  // State for data - will be populated from database
  const [attendanceData, setAttendanceData] = useState(EMPTY_DATA);
  const [newsItems, setNewsItems] = useState([
    {
      headline: "🎉 Welcome to RaJA School New Academic Year!",
      subtitle:
        "We're excited to start this new journey with all our students and staff. Please make sure to mark your attendance daily using our new digital system. If you have any questions, contact the administration office.",
    },
    {
      headline: "📚 New Library Books Available",
      subtitle:
        "We've added 200+ new books to our library collection! Visit the library during break time to explore new titles in science, literature, and technology. Library hours: 8:00 AM - 4:00 PM.",
    },
    {
      headline: "🏆 Sports Week Announcement",
      subtitle:
        "Join us for our annual Sports Week from March 15-22! Registration is now open for football, basketball, volleyball, and track events. See your PE teacher to sign up. Prizes for winners!",
    },
    {
      headline: "🎓 Parent-Teacher Conference",
      subtitle:
        "Parent-Teacher conferences are scheduled for next Friday, March 10th from 2:00 PM - 6:00 PM. Please check with your class teacher for your appointment time. We look forward to seeing all parents.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [n8nConnected, setN8nConnected] = useState(false);

  // State for news management
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  // Admin credentials
  const ADMIN_PASSWORD = "admin123";

  // Load local students from localStorage and fetch real data
  useEffect(() => {
    loadLocalStudents();
    loadDatabaseData();
  }, []);

  // Load data from n8n workflow with fallback to Google Sheets
  const loadDatabaseData = async () => {
    try {
      setLoading(true);
      setMessage("📡 Loading database data...");

      console.log("🔄 Fetching students data from n8n...");
      const result = await n8nService.getStudentsData();

      if (result.success && result.data) {
        console.log("✅ Successfully loaded database data:", result.data);
        setAttendanceData(result.data);
        setN8nConnected(true);
        setMessage("✅ Database loaded successfully!");
      } else {
        console.warn("⚠️ n8n failed, trying Google Sheets API...");
        setMessage("🔄 Trying Google Sheets API...");

        // Fallback to Google Sheets API
        try {
          const sheetsData = await sheetsService.getStudentsData();
          if (sheetsData && (sheetsData.Student || sheetsData.Employee)) {
            console.log(
              "✅ Successfully loaded from Google Sheets:",
              sheetsData
            );
            setAttendanceData(sheetsData);
            setSheetsConnected(true);
            setMessage("✅ Database loaded from Google Sheets!");
          } else {
            console.warn("⚠️ Google Sheets also failed");
            setMessage("⚠️ Failed to load from both n8n and Google Sheets");
            setN8nConnected(false);
            setSheetsConnected(false);
          }
        } catch (sheetsError) {
          console.error("❌ Google Sheets error:", sheetsError);
          console.log("🔄 Using sample data for demonstration");
          setAttendanceData(SAMPLE_DATA);
          setMessage("✅ Using sample data - Configure API key for real data");
          setN8nConnected(false);
          setSheetsConnected(false);
        }
      }
    } catch (error) {
      console.error("❌ Error loading database data:", error);
      console.log("🔄 Using sample data for demonstration");
      setAttendanceData(SAMPLE_DATA);
      setMessage("✅ Using sample data - Configure database for real data");
      setN8nConnected(false);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const loadLocalStudents = () => {
    try {
      const stored = localStorage.getItem("rajaAttendanceStudents");
      if (stored) {
        setLocalStudents(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading local students:", error);
    }
  };

  const saveLocalStudents = (students) => {
    try {
      localStorage.setItem("rajaAttendanceStudents", JSON.stringify(students));
      setLocalStudents(students);
    } catch (error) {
      console.error("Error saving local students:", error);
    }
  };

  // Student management functions
  const addStudent = () => {
    if (!newStudentForm.grade || !newStudentForm.area || !newStudentForm.name) {
      alert("Please fill in all fields");
      return;
    }

    const updated = { ...localStudents };
    if (!updated.Student[newStudentForm.grade]) {
      updated.Student[newStudentForm.grade] = {};
    }
    if (!updated.Student[newStudentForm.grade][newStudentForm.area]) {
      updated.Student[newStudentForm.grade][newStudentForm.area] = [];
    }

    // Check if student already exists
    if (
      updated.Student[newStudentForm.grade][newStudentForm.area].includes(
        newStudentForm.name
      )
    ) {
      alert("Student already exists in this grade/area");
      return;
    }

    updated.Student[newStudentForm.grade][newStudentForm.area].push(
      newStudentForm.name
    );
    saveLocalStudents(updated);
    setNewStudentForm({ grade: "", area: "", name: "" });
    setMessage("✅ Student added successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const deleteStudent = (grade, area, name) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${name} from ${grade} - ${area}?`
      )
    ) {
      const updated = { ...localStudents };
      updated.Student[grade][area] = updated.Student[grade][area].filter(
        (n) => n !== name
      );

      // Clean up empty areas and grades
      if (updated.Student[grade][area].length === 0) {
        delete updated.Student[grade][area];
        if (Object.keys(updated.Student[grade]).length === 0) {
          delete updated.Student[grade];
        }
      }

      saveLocalStudents(updated);
      setMessage("✅ Student deleted successfully!");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const getAllLocalStudents = () => {
    const students = [];
    Object.keys(localStudents.Student || {}).forEach((grade) => {
      Object.keys(localStudents.Student[grade] || {}).forEach((area) => {
        localStudents.Student[grade][area].forEach((name) => {
          students.push({ grade, area, name });
        });
      });
    });
    return students;
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
    let names = [];

    if (category === "Employee" && branch && attendanceData.Employee) {
      names = attendanceData.Employee[branch] || [];
    } else if (category === "Student" && grade && area) {
      // Check sample data first, then local data
      if (attendanceData.Student && attendanceData.Student[grade]?.[area]) {
        names = attendanceData.Student[grade][area] || [];
      } else if (
        localStudents.Student &&
        localStudents.Student[grade]?.[area]
      ) {
        names = localStudents.Student[grade][area] || [];
      }
    }

    return names.filter((name) => name && name.trim() !== "");
  };

  // Handle attendance action - now sends to n8n workflow
  const handleAttendance = async (action) => {
    if (!selectedName) {
      setMessage("Please select a name first.");
      return;
    }

    const currentDate = getTodayDate();
    const currentTime = getCurrentTime();
    const timestamp = new Date().toISOString();

    // Check local log first (for immediate feedback)
    const existingEntry = attendanceLog.find(
      (entry) => entry.name === selectedName && entry.date === currentDate
    );

    if (existingEntry) {
      // Show popup for duplicate (from local check)
      const popupMessage = `${selectedName} already logged in today!\n\nPrevious entry: ${existingEntry.action} at ${existingEntry.time}`;

      // Show popup alert
      alert(`🚫 Already Logged In!\n\n${popupMessage}`);

      // Also show message bar
      setMessage(
        `⚠️ ${selectedName} already has an entry for today (${existingEntry.action} at ${existingEntry.time}).`
      );

      // Clear selection
      setSelectedName("");

      // Clear message after 5 seconds
      setTimeout(() => setMessage(""), 5000);

      return;
    }

    const attendanceData = {
      name: selectedName,
      category,
      action,
      timestamp,
      time: currentTime,
      date: currentDate,
      branch: category === "Employee" ? branch : "",
      grade: category === "Student" ? grade : "",
      area: category === "Student" ? area : "",
    };

    // Debug logging
    console.log("🔍 DEBUG - Selected Name:", selectedName);
    console.log("🔍 DEBUG - Category:", category);
    console.log("🔍 DEBUG - Branch:", branch);
    console.log("🔍 DEBUG - Grade:", grade);
    console.log("🔍 DEBUG - Area:", area);
    console.log("🔍 DEBUG - Full attendance data:", attendanceData);

    setMessage(`📡 Recording ${selectedName}'s attendance...`);

    try {
      // Send to n8n workflow
      console.log("🚀 Sending attendance to n8n:", attendanceData);
      const result = await n8nService.logAttendance(attendanceData);

      console.log("📡 n8n Response:", result);

      if (result.success) {
        // Add to local log for immediate display
        setAttendanceLog((prev) => [...prev, attendanceData]);
        setMessage(
          `✅ ${selectedName} marked as ${action} at ${currentTime} (Saved to database)`
        );
        console.log("✅ Attendance recorded successfully:", result);
      } else {
        // Check if it's a duplicate attendance
        if (result.isDuplicate || result.error === "Duplicate attendance") {
          // Show popup for duplicate
          const existingRecord = result.existingRecord;
          const existingAction =
            existingRecord?.Action || existingRecord?.action || "unknown";
          const existingTime =
            existingRecord?.Time || existingRecord?.time || "unknown";

          const popupMessage =
            result.message ||
            `${selectedName} already logged in today!\n\nPrevious entry: ${existingAction} at ${existingTime}`;

          // Show popup alert
          alert(`🚫 Already Logged In!\n\n${popupMessage}`);

          // Also show message bar
          setMessage(`⚠️ ${selectedName} already logged in today!`);
          console.log("⚠️ Duplicate attendance detected:", result);
        }
        // Check if it's the "Workflow was started" issue
        else if (
          result.method === "n8n-students-incomplete" ||
          result.method === "n8n-attendance-incomplete" ||
          (result.error && result.error.includes("Workflow started"))
        ) {
          console.warn(
            "⚠️ n8n workflow configuration issue - using local storage"
          );
          // Still add to local log
          setAttendanceLog((prev) => [...prev, attendanceData]);
          setMessage(
            `⚠️ ${selectedName} marked as ${action} (Local only - n8n config issue)`
          );
        } else {
          setMessage(`❌ Failed to record: ${result.message || result.error}`);
          console.warn("⚠️ Attendance recording failed:", result);
        }
      }
    } catch (error) {
      console.error("❌ Error recording attendance:", error);
      // Fallback: still add to local log
      setAttendanceLog((prev) => [...prev, attendanceData]);
      setMessage(
        `⚠️ ${selectedName} marked as ${action} (Local only - database error)`
      );
    }

    // Clear selection
    setSelectedName("");

    // Clear message after 5 seconds
    setTimeout(() => setMessage(""), 5000);
  };

  // Get today's attendance log
  const getTodayLog = () => {
    const today = getTodayDate();
    return attendanceLog.filter((entry) => entry.date === today);
  };

  // Clear today's log
  const clearTodayLog = () => {
    if (
      window.confirm("Are you sure you want to clear today's attendance log?")
    ) {
      const today = getTodayDate();
      setAttendanceLog((prev) => prev.filter((entry) => entry.date !== today));
      setMessage("✅ Today's attendance log cleared!");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Admin functions
  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminAuth(true);
      setAdminMessage("✅ Admin access granted!");
      setTimeout(() => setAdminMessage(""), 3000);
    } else {
      setAdminMessage("❌ Invalid password!");
      setTimeout(() => setAdminMessage(""), 3000);
    }
    setAdminPassword("");
  };

  const updateHeadline = (newHeadline) => {
    const updated = [...newsItems];
    updated[currentNewsIndex] = {
      ...updated[currentNewsIndex],
      headline: newHeadline,
    };
    setNewsItems(updated);
    setMessage("✅ Headline updated!");
    setTimeout(() => setMessage(""), 3000);
  };

  const updateSubtitle = (newSubtitle) => {
    const updated = [...newsItems];
    updated[currentNewsIndex] = {
      ...updated[currentNewsIndex],
      subtitle: newSubtitle,
    };
    setNewsItems(updated);
    setMessage("✅ Subtitle updated!");
    setTimeout(() => setMessage(""), 3000);
  };

  const nextNews = () => {
    setCurrentNewsIndex((prev) => (prev + 1) % newsItems.length);
  };

  const prevNews = () => {
    setCurrentNewsIndex(
      (prev) => (prev - 1 + newsItems.length) % newsItems.length
    );
  };

  const getCurrentNews = () => {
    return newsItems[currentNewsIndex] || newsItems[0];
  };

  const getAllPeople = () => {
    const people = [];

    // Add employees
    Object.keys(attendanceData.Employee || {}).forEach((branch) => {
      attendanceData.Employee[branch].forEach((name) => {
        people.push({ name, category: "Employee", branch });
      });
    });

    // Add students
    Object.keys(attendanceData.Student || {}).forEach((grade) => {
      Object.keys(attendanceData.Student[grade] || {}).forEach((area) => {
        attendanceData.Student[grade][area].forEach((name) => {
          people.push({ name, category: "Student", grade, area });
        });
      });
    });

    return people;
  };

  const currentNews = getCurrentNews();
  const todayLog = getTodayLog();

  return (
    <div className="App">
      <div className="container">
        {/* Status */}
        <div className="status-bar">
          <span className="status-item">
            📊 Database:{" "}
            <strong>
              {n8nConnected
                ? "n8n Connected"
                : sheetsConnected
                ? "Google Sheets Connected"
                : "Disconnected"}
            </strong>
          </span>
          <span className="status-item">
            📅 Today: <strong>{getTodayDate()}</strong>
          </span>
          <span className="status-item">
            ✅ Entries: <strong>{todayLog.length}</strong>
          </span>
          <span className="status-item">
            👥 Total People: <strong>{getAllPeople().length}</strong>
          </span>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`message ${
              message.includes("❌") ? "error" : "success"
            }`}
          >
            {message}
          </div>
        )}

        {/* News Display */}
        <div className="news-section">
          <h2>{currentNews.headline}</h2>
          <p>{currentNews.subtitle}</p>
          {newsItems.length > 1 && (
            <div className="news-controls">
              <button onClick={prevNews}>← Previous</button>
              <span>
                {currentNewsIndex + 1} of {newsItems.length}
              </span>
              <button onClick={nextNews}>Next →</button>
            </div>
          )}
        </div>

        {/* Main Content - Side by Side */}
        <div className="main-content">
          {/* Attendance Form */}
          <div className="attendance-form">
            <h3>📋 Record Attendance</h3>

            {/* Category Selection */}
            <div className="form-group">
              <label>Category:</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Employee">Employee</option>
                <option value="Student">Student</option>
              </select>
            </div>

            {/* Employee Branch Selection */}
            {category === "Employee" && (
              <div className="form-group">
                <label>Branch:</label>
                <select
                  value={branch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                >
                  <option value="">Select Branch</option>
                  {Object.keys(attendanceData.Employee || {}).map(
                    (branchName) => (
                      <option key={branchName} value={branchName}>
                        {branchName}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {/* Student Grade Selection */}
            {category === "Student" && (
              <div className="form-group">
                <label>Grade:</label>
                <select
                  value={grade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                >
                  <option value="">Select Grade</option>
                  {Object.keys(attendanceData.Student || {}).map(
                    (gradeName) => (
                      <option key={gradeName} value={gradeName}>
                        {gradeName}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {/* Student Area Selection */}
            {category === "Student" && grade && (
              <div className="form-group">
                <label>Area:</label>
                <select
                  value={area}
                  onChange={(e) => handleAreaChange(e.target.value)}
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
            {((category === "Employee" && branch) ||
              (category === "Student" && grade && area)) && (
              <div className="form-group">
                <label>Name:</label>
                <select
                  value={selectedName}
                  onChange={(e) => setSelectedName(e.target.value)}
                >
                  <option value="">Select Name</option>
                  {getAvailableNames().map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            {selectedName && (
              <div className="action-buttons">
                <button
                  className="btn-present"
                  onClick={() => handleAttendance("present")}
                >
                  ✅ Mark Present
                </button>
                <button
                  className="btn-absent"
                  onClick={() => handleAttendance("absent")}
                >
                  ❌ Mark Absent
                </button>
              </div>
            )}
          </div>

          {/* Today's Log */}
          <div className="today-log">
            <h3>📊 Today's Attendance ({todayLog.length})</h3>
            {todayLog.length > 0 ? (
              <>
                <div className="log-controls">
                  <button onClick={clearTodayLog} className="btn-clear">
                    🗑️ Clear Log
                  </button>
                </div>
                <div className="log-entries">
                  {todayLog.map((entry, index) => (
                    <div key={index} className={`log-entry ${entry.action}`}>
                      <div>
                        <strong>{entry.name}</strong>
                        <br />
                        <small>{entry.category}</small>
                      </div>
                      <div>
                        <span className="action">{entry.action}</span>
                        <br />
                        <span className="time">{entry.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  padding: "2rem",
                }}
              >
                <p>📭 No attendance records for today</p>
                <p>Start by marking someone present!</p>
              </div>
            )}
          </div>
        </div>

        {/* Admin Panel */}
        <div className="admin-panel">
          <button
            className="admin-toggle"
            onClick={() => setAdminOpen(!adminOpen)}
          >
            {adminOpen ? "▼" : "▶"} Admin Panel
          </button>

          {adminOpen && (
            <div className="admin-content">
              {!adminAuth ? (
                <div className="admin-login">
                  <input
                    type="password"
                    placeholder="Admin Password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
                  />
                  <button onClick={handleAdminLogin}>Login</button>
                  {adminMessage && (
                    <p className="admin-message">{adminMessage}</p>
                  )}
                </div>
              ) : (
                <div>
                  <p>Admin features coming soon...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Refresh Button */}
        <button
          className="floating-refresh"
          onClick={loadDatabaseData}
          disabled={loading}
          title="Refresh Database"
        >
          {loading ? "⟳" : "🔄"}
        </button>
      </div>
    </div>
  );
}

export default AttendanceApp;
