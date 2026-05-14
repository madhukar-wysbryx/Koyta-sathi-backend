# **Koyta Tracking App – PPT Flow Document**

Based only on the PPT flow provided. fileciteturn0file0

---

# **Screen 1 – Intro Screen**

### **Purpose**

Initial introduction screen of the app.

### **Content**

* App logo  
* Intro text  
* Get Started button

---

# **Screen 2 – Onboarding Screen**

### **Purpose**

Explain app usage to users.

### **Content**

* Onboarding illustrations  
* Introductory information  
* Next button

---

# **Screen 3 – Onboarding Screen**

### **Purpose**

Continue onboarding flow.

### **Content**

* App explanation  
* Tracking explanation  
* Continue button

---

# **Screen 4 – Toli Details Screen**

### **Purpose**

Collect toli information.

### **Fields**

* Number of Full Koytas  
* Number of Half Koytas  
* Toli details

---

# **Screen 5 – Toli Details Screen**

### **Purpose**

Continue toli setup.

### **Content**

* Toli information summary  
* Workforce details

### **Weighted Count Logic**

* Full Koyta \= 1.0  
* Half Koyta \= 0.5

### **Example**

If a Toli has:

* 8 Full Koytas  
* 4 Half Koytas

Then total weighted workers \= 10.0

---

# **Screen 6 – Vehicle Details Screen**

### **Purpose**

Collect vehicle and wage details.

### **Fields**

* Vehicle Type  
* Tons per Vehicle  
* Rate per Ton

### **Example Rates**

* Tractor \= ₹366.01 per ton  
* Truck \= ₹408.41 per ton

---

# **Screen 7 – Transition Screen**

### **Purpose**

Show transition before dashboard.

### **Content**

* Setup completion message  
* Start tracking message

---

# **Screen 8 – Tracker Dashboard**

### **Purpose**

Main dashboard tracking screen.

### **Features**

* Total vehicles loaded  
* Total earnings  
* Remaining debt  
* Daily tracking information

### **Note**

Dashboard updates automatically after adding entries.

---

# **Screen 9 – Add Daily Update**

### **Purpose**

Add daily vehicle updates.

### **Trigger**

Opened by clicking “+” button on dashboard.

### **Fields**

* Vehicle Type  
* Number of Vehicles  
* Date  
* Notes

---

# **Screen 10 – Dashboard Auto Update**

### **Purpose**

Show updated dashboard automatically.

### **Updates**

* Earnings update  
* Debt update  
* Vehicle count update  
* Progress update

---

# **Screen 11 – Slip Upload Feature**

### **Purpose**

Allow users to upload slips.

### **Features**

* Upload slips once a month  
* View uploaded slips

---

# **Screen 12 – Ledger Screen**

### **Purpose**

Show ledger and transaction history.

### **Features**

* Daily updates history  
* Earnings records  
* Debt tracking  
* Running ledger entries

### **Note**

Ledger keeps updating as daily entries are added.

---

# **Wage Calculation Algorithm**

## **Total Group Earnings**

### **Formula**

Rate per Ton × Tons per Vehicle × Number of Vehicles

### **Example**

If:

* Tractor Rate \= ₹366.01  
* Tons per Vehicle \= 3.5  
* Vehicles Loaded \= 10

Then:  
366.01 × 3.5 × 10

Total Group Earnings \= ₹12,810.35

---

# **Individual Household Earnings**

### **Weighted Count Rules**

* Full Koyta \= 1.0  
* Half Koyta \= 0.5

### **Example**

If a Toli has:

* 8 Full Koytas  
* 4 Half Koytas

Then:  
8 × 1.0 \= 8  
4 × 0.5 \= 2

Total weighted workers \= 10

### **Formula**

Total Group Earnings ÷ Weighted Count

---

# **Remaining Debt**

### **Purpose**

Workers can instantly see how much debt is cleared after every vehicle loaded.

### **Formula**

Remaining Debt \= Previous Debt − Earnings Cleared

---

# **Features to be Added (Not in Mockup Yet)**

## **Feature 1**

Allow workers to provide:

* Number of full tolis worked daily  
* Number of half tolis worked daily

---

## **Feature 2**

Allow workers to download the final ledger as PDF and save it on their phone.

---

# 

