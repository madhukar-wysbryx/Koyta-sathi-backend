# **Koyta Budget Planning App – Complete Flow Document**

## **Project Overview**

This application is designed for Koyta workers to help them:

* Plan seasonal advances  
* Track expenses and priorities  
* Learn financial planning through stories and quizzes  
* Monitor repayment progress  
* Manage advance usage and priorities

The app flow is divided into multiple onboarding, learning, planning, tracking, and profile management screens.

---

# **Application Flow**

## **Screen 1 – Signup & Login Page**

### **Purpose**

This is the entry screen for users.

### **Features**

#### **Signup Section**

* User can create a new account.  
* Fields:  
  * Full Name  
  * Mobile Number  
  * Password  
  * Confirm Password

#### **Login Section**

* Existing users can log in.  
* Fields:  
  * Mobile Number  
  * Password

### **Navigation**

* Clicking on **Signup** → Opens Screen 2  
* Clicking on **Login** → Opens Dashboard Screen

### **Validation**

* Mobile number should be valid.  
* Password and Confirm Password should match.  
* Empty fields should show validation errors.

---

# **Screen 2 – Welcome Page After Signup**

### **Purpose**

This screen welcomes the newly registered user.

### **Content**

* Welcome message  
* Introduction about the app  
* Short explanation of financial planning benefits

### **CTA Button**

* “Start Learning”

### **Navigation**

* Clicking “Start Learning” → Opens Screen 3

---

# **Screen 3 – Geeta Tai’s Story**

## **Module Name**

Learn from Her Wisdom

### **Purpose**

Educational storytelling screen.

### **Content**

* Story of Geeta Tai  
* Financial struggles and planning lessons  
* Motivational learning content

### **UI Elements**

* Story illustration/image  
* Scrollable story content  
* Next button

### **Navigation**

* Next → Opens Quiz Screen

---

# **Screen 4 – Geeta Tai’s Quiz**

### **Purpose**

Test the user’s understanding from the story.

### **Features**

* 1 question per screen  
* 4 options for each question  
* Total 5 quiz steps/screens

### **Quiz Flow**

* Question 1 → Next  
* Question 2 → Next  
* Question 3 → Next  
* Question 4 → Next  
* Question 5 → Submit

### **Validation**

* User must select one option before proceeding.

### **Data Tracking**

* Store:  
  * Selected answer  
  * Correct answer  
  * Score

### **Navigation**

* Submit → Opens Screen 5

---

# **Screen 5 – Quiz Score & Solutions Page**

### **Purpose**

Show quiz performance and explanations.

### **Features**

* Total Score  
* Correct Answers  
* Wrong Answers  
* Detailed solutions/explanations

### **UI Components**

* Score card  
* Solution cards  
* Motivational message

### **CTA Button**

* Continue Learning

### **Navigation**

* Opens Screen 6

---

# **Screen 6 – Gauri’s Story**

## **Module Name**

Learning Module – Staying on Track

### **Purpose**

Second financial learning story.

### **Content**

* Gauri’s financial journey  
* Importance of staying on track  
* Budget planning concepts

### **UI Elements**

* Story image  
* Scrollable content  
* Continue button

### **Navigation**

* Continue → Opens Screen 7

---

# **Screen 7 – Jagdish’s Story**

## **Module Name**

Learning Module – Staying on Track

### **Purpose**

Third educational story.

### **Content**

* Jagdish’s seasonal planning  
* Advance management lessons  
* Repayment discipline

### **UI Elements**

* Story image  
* Educational content  
* Next button

### **Navigation**

* Next → Opens Screen 8

---

# **Screen 8 – Choose Your Priorities**

### **Purpose**

Help users categorize expenses.

### **Instruction**

“Help Geeta Tai prioritize her expenses. Which of these are ‘Must Have’ right now, and which can ‘Wait for Later’?”

### **Features**

* Expense selection cards  
* Two categories:  
  * Must Have  
  * Wait for Later

### **Interaction**

* Drag & Drop OR Toggle Selection

### **Validation**

* User must categorize all items.

### **Navigation**

* Continue → Opens Screen 9

---

# **Screen 9 – Your Priorities Result Page**

### **Purpose**

Show categorized priorities.

### **Features**

* Must Have list  
* Wait for Later list  
* Learning summary  
* Smart recommendations

### **CTA Button**

* Continue Planning

### **Navigation**

* Opens Screen 10

---

# **Screen 10 – Past Season Recall**

### **Purpose**

Collect past seasonal financial data.

## **Sections**

### **Season 1 – 2024**

### **Season 2 – 2025**

Both seasons contain the same fields:

### **Fields**

* Advance Taken  
* Days Worked  
* Arrears Remaining  
* Advance Pending at Start

---

## **Upcoming Season Plan Section**

### **Field**

* Planned Advance Amount

### **Purpose**

Prepare planning for the upcoming season.

### **Navigation**

* Continue → Opens Screen 11

---

# **Screen 11 – Advance Plan 2026**

### **Purpose**

Generate advance repayment planning.

### **Inputs**

* Previous 2 seasons’ arrears remaining  
* Current season planned advance amount

### **Calculations**

#### **Show:**

* Total amount to repay  
* Estimated repayment duration  
* Estimated number of days/months to complete repayment

### **Smart Insights**

* Monthly repayment estimate  
* Daily repayment estimate  
* Risk indicator if amount is too high

### **Editable Plan**

User can:

* Revise planned advance  
* Update repayment assumptions  
* Recalculate plan dynamically

### **Validation**

* Planned advance should not exceed limit.

### **Navigation**

* Continue → Opens Screen 12

---

# **Screen 12 – Priority Plan 2026**

### **Purpose**

Identify high-priority expenses.

### **Instruction**

“Identify your absolute priority expenditures for the year ahead.”

### **Features**

* Priority categories selection  
* Budget planning inputs

### **Categories Example**

* Food  
* Education  
* Medical  
* Family Support  
* Loan Repayment  
* Travel  
* Farming Needs

### **Navigation**

* Continue → Opens Screen 13

---

# **Screen 13 – Priority Plan 2026 (Detailed)**

### **Purpose**

Allow users to add their priority items.

### **Features**

* User can select/add up to 10 priority items.  
* Only “Must Have” items should allow amount entry.

### **Fields Per Item**

* Priority Item Name  
* Amount  
* Category

### **Validation Rules**

* Maximum 10 items allowed.  
* Amount field enabled only for Must Have priorities.  
* Total priority amount should be tracked.

### **UI Logic**

* Show remaining budget dynamically.  
* Show warnings if total exceeds planned advance.

### **Navigation**

* Continue → Opens Screen 14

---

# **Screen 14 – Ready to Track\!**

### **Purpose**

Final confirmation before dashboard.

### **Features**

* Summary of:  
  * Planned advance  
  * Priority items  
  * Repayment estimate  
  * Financial goals

### **PDF Download**

User can:

* Download financial plan as PDF

### **CTA Button**

* Go to Dashboard

### **Navigation**

* Opens Dashboard Screen

---

# **Screen 15 – Dashboard Page**

### **Purpose**

Main financial tracking dashboard.

## **Sections**

### **1\. Advance Usage**

Displays:

* Total planned advance  
* Used advance amount  
* Remaining advance  
* Usage percentage

### **Business Logic**

* If user takes more advance than planned:  
  * Show error/warning message  
* Usage percentage increases dynamically.

### **Example**

If:

* Planned Advance \= ₹50,000  
* Used \= ₹25,000  
  Then:  
* Usage \= 50%  
* Remaining \= ₹25,000

---

### **2\. Priority Goal Tracker**

Displays:

* Total priority budget  
* Used amount  
* Remaining amount  
* Progress percentage

### **UI Components**

* Progress bars  
* Summary cards  
* Warning indicators

---

### **3\. Financial Insights**

Optional future enhancement:

* Spending trends  
* Risk alerts  
* Savings recommendations

---

# **Screen 16 – Ledger Page**

### **Purpose**

Track all financial transactions.

## **Sections**

### **1\. Transaction History**

Displays:

* Date  
* Amount  
* Purpose  
* Transaction Type

### **2\. Add Entry**

User can add new advance entries.

### **Fields**

* Amount  
* Purpose  
* Date

### **Validation**

* Amount should be numeric.  
* Date should not be invalid.  
* Purpose cannot be empty.

### **Features**

* Real-time balance updates  
* Search/filter transactions  
* Sort by date

---

# **Screen 17 – Profile Page**

### **Purpose**

Manage user profile information.

### **Fields**

* Name  
* Mobile Number  
* Village

### **Features**

* Edit profile  
* Save updated information  
* Validation for mobile number

### **Additional Section**

#### **Sign-Out Button**

* User can securely log out.

---

# **Core Functional Requirements**

## **Authentication**

* Signup  
* Login  
* Logout  
* Session handling

## **Learning Modules**

* Story screens  
* Quiz system  
* Score calculation  
* Solution explanations

## **Financial Planning**

* Seasonal planning  
* Advance calculation  
* Repayment estimation  
* Priority planning

## **Dashboard Tracking**

* Advance usage tracking  
* Goal tracking  
* Progress calculation  
* Alerts & warnings

## **Ledger Management**

* Transaction history  
* Add entries  
* Real-time updates

## **PDF Export**

* Generate downloadable financial summary PDF

---

# **Suggested Tech Stack**

## **Frontend**

* Next.js  
* React  
* Tailwind CSS  
* TypeScript

## **Backend**

* Node.js  
* Next.js API Routes / Express

## **Database**

* PostgreSQL  
* Prisma ORM

## **Authentication**

* NextAuth  
* JWT

## **PDF Generation**

* jsPDF / react-pdf

---

# **Suggested Dashboard Calculations(doubt)**

## **Advance Usage Percentage**

Formula:

Used Advance / Planned Advance × 100

---

## **Remaining Advance**

Formula:

Planned Advance − Used Advance

---

## **Priority Goal Percentage**

Formula:

Used Priority Amount / Total Priority Budget × 100

---

# **Future** 

* Multi-language support  
* Voice guidance


---

# **Final User Journey**

1. Signup/Login  
2. Welcome onboarding  
3. Learning stories  
4. Quiz and score  
5. Priority understanding  
6. Seasonal financial planning  
7. Advance planning  
8. Priority budgeting  
9. PDF summary  
10. Dashboard tracking  
11. Ledger management  
12. Profile management

---

# **End of Document**

