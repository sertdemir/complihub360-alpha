## **Typography Strategy (Expert)**

The system is architected across two distinct cognitive levels to facilitate safe navigation through regulatory complexity:

* **Level 1: Trust / Institution / Brand:** Uses **IBM Plex Serif** for headlines to convey authority, expertise, and a high-value institutional feel.  
* **Level 2: Interface / Data / Navigation:** Uses **IBM Plex Sans** for UI elements, tables, and dashboards to ensure readability, clarity, and technical precision.

### **Core Principles**

1. **Fluid Typography:** Scalable sizes using clamp() logic instead of rigid breakpoints.  
2. **Clear Device Scaling:** Precise mapping across mobile, tablet, and desktop environments.  
3. **Optimal Line Length:** Constrained to **65–75 characters** for maximum readability on desktop.

## 

## **Technical Tokens (Developer Ready)**

### **Font Families**

* **font.brand (Headlines):** IBM Plex Serif.  
* **font.ui (Interface/Copy):** IBM Plex Sans.

### **Global Scaling Rules**

* **Modular Scale:** **1.25** (Ideal for data interfaces and enterprise UIs).  
* **Line Height Ratios:**  
  * **Headlines:** 1.2   
  * **Body:** 1.6   
  * **UI Elements:** 1.4   
* **Numeric Data:** Supports **Tabular Numbers** for alignment in tables and dashboards.

## 

## **Typography Scale: Headlines (Serif)**

All headlines utilize a line height of **1.2**.

| Level | Desktop (Size) | Tablet (Size) | Mobile (Size) | Line Height |
| :---- | :---- | :---- | :---- | :---- |
| **Display** | 56px  | 44px  | 36px  | 1.15  |
| **H1** | 36px  | 32px  | 28px  | 1.2  |
| **H2** | 28px  | 24px  | 22px  | 1.2  |
| **H3** | 20px  | 20px  | 18px  | 1.2  |

## 

## **Typography Scale: Copy & UI (Sans Serif)**

| Element | Device | Size | Line Height | Notes |
| :---- | :---- | :---- | :---- | :---- |
| **Body** | Tablet/Desktop | 16px  | 1.6  | Standard copy  |
| **Body** | Mobile | 15px  | 1.15  | Reduced for small screens  |
| **Small UI** | Tablet/Desktop | 14px  | 1.2  | Captions & metadata  |
| **Small UI** | Mobile | 13px  | 1.2  | Minimum mobile size  |
| **Caption** | All Devices | 12px  | 1.2  | Letter spacing: 0.04em  |

## 

## **Specialized Data Components**

Specifically optimized for the **Results Page** and **Compliance Dashboard**.

### **Tables / Numeric Data**

* **Header:** 13px, Line Height 1.2.  
* **Cell:** 14px, Line Height 1.2.  
* **Numeric Data:** 14px, Line Height 1.2 (Use **Tabular Numbers** for vertical alignment).

### **Mobile UX Constraints**

* **Minimum Text:** **14px** (Anything lower risks accessibility issues and poor legibility).  
* **Button Text:** **16px** (Recommended for tap targets and visibility).

## **Implementation Prompt (Builder/Bolt)**

TypeScript  
/\*\*  
 \* CompliHub360 Typography System v1.0  
 \* IBM Plex Serif (Brand) \+ IBM Plex Sans (UI)  
 \*/

export const typography \= {  
  fontFamily: {  
    brand: '"IBM Plex Serif", serif',  
    ui: '"IBM Plex Sans", sans-serif',  
  },  
  fluidScale: {  
    h1: 'clamp(28px, 2.5vw, 36px)',  
    body: 'clamp(15px, 1.2vw, 16px)',  
  },  
  lineHeight: {  
    headings: 1.2,  
    body: 1.6,  
    ui: 1.4,  
  },  
  numeric: {  
    fontVariantNumeric: 'tabular-nums',  
  },  
  constraints: {  
    mobileMinText: '14px',  
    desktopMaxLineLength: '75ch',  
  }  
}