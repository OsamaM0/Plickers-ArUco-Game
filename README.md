# 🎓 ArUco Classroom Quiz Game

An interactive classroom quiz system using ArUco markers - similar to Plickers! Teachers generate unique markers for students, and students can answer questions by rotating their marker to show A, B, C, or D.

## 🚀 Quick Start

### For Laptop Testing (HTTP - localhost only)
```bash
python3 -m http.server 8000
```
Then open: http://localhost:8000

### For Mobile Devices (HTTPS Required!)
```bash
python3 https_server.py
```
Then open: **https://YOUR-IP:8000** (e.g., https://192.168.8.135:8000)

**Important:** When accessing from mobile, you'll see a security warning about the certificate. This is normal for local development:
1. Click **"Advanced"** or **"Details"**
2. Click **"Proceed"** or **"Accept Risk and Continue"**
3. The camera will now work! 🎉

## 📱 Why HTTPS?

Modern browsers **block camera access** on non-localhost HTTP connections for security. That's why:
- ✅ Laptop/Desktop: Works with HTTP on `localhost`
- ❌ Mobile/Tablet: Needs HTTPS when accessing via IP address (e.g., 192.168.x.x)

The `https_server.py` script creates a secure connection so mobile cameras work!

## 🎯 How It Works

### 👨‍🏫 Teacher Mode
1. Enter student name and a unique marker ID (1-1000)
2. Click **"Generate & Download"** to create an ArUco marker PDF
3. Print the marker and give it to the student
4. Each marker has 4 sides labeled: **A**, **B**, **C**, **D**

### 👨‍🎓 Student Mode
1. Click **"Start Scanning"**
2. Allow camera access when prompted
3. Hold your marker up to the camera
4. Rotate the marker to show your answer:
   - **A** - Hold normally (arrow pointing up)
   - **B** - Rotate 90° clockwise (arrow to the right)
   - **C** - Rotate 180° (upside down)
   - **D** - Rotate 270° clockwise (arrow to the left)
5. Your name and answer appear on the teacher's display!

## ⌨️ Keyboard Shortcuts
- `Alt + T` - Switch to Teacher Mode
- `Alt + S` - Switch to Student Mode
- `Space` - Start/Stop Scanning (in Student Mode)

## 🌐 Network Access

### Find Your IP Address
```bash
hostname -I | awk '{print $1}'
```

### Start HTTPS Server
```bash
python3 https_server.py
```

The script will display:
- Your local IP address
- URLs for accessing from other devices
- Instructions for accepting the security certificate

### Firewall (if needed)
If devices can't connect, allow port 8000:
```bash
# Ubuntu/Debian
sudo ufw allow 8000/tcp

# Fedora/RHEL
sudo firewall-cmd --add-port=8000/tcp --permanent
sudo firewall-cmd --reload
```

## 🛠️ Troubleshooting

### Camera Not Working on Mobile?
1. ✅ Are you using **HTTPS** (https://)? Camera won't work with HTTP!
2. ✅ Did you accept the security certificate warning?
3. ✅ Did you grant camera permission when prompted?
4. ✅ Is your phone on the same Wi-Fi network?
5. ✅ Check if guest Wi-Fi isolation is enabled (disable it)

### Server Not Accessible?
```bash
# Check if server is running
ss -tuln | grep 8000

# Verify your IP
hostname -I
```

### Certificate Errors?
If you need to regenerate the SSL certificate:
```bash
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$(hostname -I | awk '{print $1}')"
```

## 📁 Project Structure

```
.
├── index.html              # Main application interface
├── https_server.py         # HTTPS server for mobile access
├── cert.pem & key.pem      # SSL certificates (auto-generated)
├── aruco-detector.js       # Camera and ArUco detection logic
├── aruco-generator.js      # Marker generation for teachers
├── utils.js                # Utility functions
├── styles.css              # Application styling
├── opencv.js               # OpenCV.js library
└── src/
    ├── app.js              # Main application logic
    └── arcogen_dict.json   # ArUco dictionary data
```

## 🔒 Security Notes

- **Self-signed certificates** are safe for local development
- Only use on **trusted networks** (home/school Wi-Fi)
- Don't expose the server to the public internet without proper security
- The warning about certificate is expected - you can safely proceed

## 💡 Tips

1. **Print Quality**: Print markers in high quality for best detection
2. **Lighting**: Ensure good lighting when scanning
3. **Distance**: Hold marker 15-30cm from camera
4. **Steady Hands**: Keep marker steady for better detection
5. **Unique IDs**: Each student needs a unique marker ID

## 📚 Technologies Used

- **OpenCV.js** - ArUco marker detection
- **WebRTC** - Camera access
- **HTML5 Canvas** - Real-time video processing
- **Python HTTPS Server** - Secure local hosting
- **ArUco Dictionary** - Marker generation (4x4_1000)

## 🎉 Features

- ✨ Real-time marker detection
- 📱 Mobile-friendly interface
- 🎨 Modern, clean UI with gradients
- ⌨️ Keyboard shortcuts for quick navigation
- 🔔 Toast notifications for feedback
- 📄 PDF generation for printable markers
- 🎯 Support for 1000 unique markers
- 🔄 Front/back camera switching
- 📊 Live student response board

## 🤝 Contributing

Feel free to improve the project! Common enhancements:
- Add answer statistics/analytics
- Timer for timed quizzes
- Save/load student lists
- Export results to CSV
- Multiple choice question display

## 📄 License

Open source project for educational purposes.

---

Made with ❤️ for interactive classroom learning!
