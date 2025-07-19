# EdTech Operations & Learning Management Portal

## 🚀 Overview  
A full-stack EdTech operations and learning management portal designed to streamline and manage online 1:1 tutoring for K–12 students. The platform supports four roles: **Admin**, **Operations Manager**, **Teacher**, and **Student**, offering a seamless experience from class scheduling to curriculum delivery and performance tracking.

---

## 🎯 Key Features

### 🔐 Role-Based Authentication  
- Firebase Authentication with Firestore validation  
- Secure login for Students, Teachers, Operations Managers, and Admins  
- Separate dashboards based on user role

### 📅 Student Dashboard  
- Weekly class schedule with time, subject, teacher, and Zoom link  
- Curriculum page showing upcoming and past classes with:  
  - Class title & description  
  - Homework link (PDF, image, or text)  
  - Notes/resource link  
  - Class recording link  
- Homework submission system:  
  - Upload multiple files  
  - One-time submission marked as “Submitted”  
  - Stored in Firestore with student ID, class ID, and timestamp

### 👩‍🏫 Teacher Dashboard  
- Sidebar layout with today’s class schedule  
- Displays student name, grade, subject, time, and join link  
- Post-class popup:  
  - Optional personalized notes upload  
  - Mandatory feedback to parent (auto-shared)

### 🛠 Operations Dashboard  
- Today’s classes with teacher and student details  
- Quick links to curriculum editor, student database, and teacher database  
- Class reschedule & cancellation flows:  
  - Teacher requests go via Ops → Student notified → Rescheduled  
  - Parent requests go via Ops → Teacher time slots shown → Finalized  

### 📘 Curriculum Manager (Phase 2)  
- Add, edit, delete classes by grade and subject  
- Fields include:  
  - Class number  
  - Title and description  
  - Homework, notes, and recording links  

---

## 🧱 Tech Stack  
- **Frontend**: Next.js, Tailwind CSS  
- **Backend**: Firebase Authentication, Firestore, Firebase Storage  

---



