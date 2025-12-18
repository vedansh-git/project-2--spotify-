const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// ------------------ Config ------------------
const SECRET = process.env.JWT_SECRET || "spotifyclone_secret_key";
const PORT = process.env.PORT || 5501;
// Replace <db_password> with your actual MongoDB Atlas password
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://hevy:sh12arm@cluster0.930mbq1.mongodb.net/?appName=Cluster0";
// Example: "mongodb+srv://hevy:MyPassword123@cluster0.930mbq1.mongodb.net/spotify-clone?retryWrites=true&w=majority"

// ------------------ Middleware ------------------
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve all files from current directory

// ------------------ Auth Middleware ------------------
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ------------------ MongoDB ------------------
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ------------------ User Schema ------------------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// ------------------ Helpers ------------------
function isStrongPassword(password) {
  // Min 8, at least 1 upper, 1 lower, 1 number, 1 special
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}

// ------------------ Auth Routes ------------------

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 chars and include uppercase, lowercase, number and special char",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    return res.json({ success: true, message: "User created successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password" });

    const token = jwt.sign({ userId: user._id, name: user.name }, SECRET, { expiresIn: "24h" });
    return res.json({ success: true, token, name: user.name });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Verify token (for checking if user is logged in)
app.get("/verify", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Password reset request
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign({ userId: user._id }, SECRET, { expiresIn: "1h" });
    
    // In a real app, you would send this token via email
    // For now, we'll just return it
    return res.json({ 
      success: true, 
      message: "Reset token generated",
      resetToken // In production, send this via email instead
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Reset password
app.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error: "Password must be at least 8 chars and include uppercase, lowercase, number and special char",
      });
    }

    const decoded = jwt.verify(token, SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await User.findByIdAndUpdate(decoded.userId, { password: hashedPassword });

    return res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Reset token has expired" });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ------------------ Root Route ------------------
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// ------------------ Start Server ------------------
app.listen(PORT, () => {
  console.log(`🎵 Spotify Clone Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
});
