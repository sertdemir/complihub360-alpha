# **Design System: Core Color Specification v1.1**

## **1\. The Compliance Logic (Expert)**

In international regulation, visual hierarchy serves as a cognitive safety layer. The color strategy reduces the high mental load of compliance officers by using distinct color associations:

* **Petrol (Trust & Authority):** Signals gravity and professionalism.  
  \+2  
* **Gold (Strategic Action):** Exclusively reserved for **Verified Partner** elements to highlight premium, risk-mitigated choices.  
  \+2  
* **Neutral Surfaces:** Use warm greys to prevent "screen fatigue" during long research sessions.  
  \+2

## **2\. The MVP Requirement (Strategist)**

To support the **"Search-to-Unlock"** monetization model, the UI must clearly differentiate between information and commercial engagement:

* **Primary Action (Petrol):** Assigned to the **Engagement Request** (Lead generation).  
  \+2  
* **Premium Badge (Gold):** Used for **Partner Highlights** to drive transaction fees.  
  \+2  
* **Information Layer:** Neutral and soft blues for laws, tutorials, and guides.  
  \+2

## **3\. Expanded Technical Color Tokens**

### **A. Primary Palette (Brand & Actions)**

| Token | Hex | RGB | Usage |
| :---- | :---- | :---- | :---- |
| `primary-500` | `#097070` | `(9, 112, 112)` | Main Brand, Primary CTAs  |
| `primary-600` | `#075C5C` | `(7, 92, 92)` | Hover states  |
| `primary-700` | `#054848` | `(5, 72, 72)` | Pressed/Deep accents  |

In Google Sheets exportieren

### **B. Accent Palette (Premium & Monetization)**

| Token | Hex | RGB | Usage |
| :---- | :---- | :---- | :---- |
| `accent-500` | `#D3B454` | `(211, 180, 84)` | Partner Badges  |
| `accent-600` | `#B89B3E` | `(184, 155, 62)` | Hover for accents  |
| `accent-700` | `#9C8434` | `(156, 132, 52)` | Deep gold highlights |

In Google Sheets exportieren

### **C. Neutral & Surface (Layout & Depth)**

| Token | Hex | RGB | Usage |
| :---- | :---- | :---- | :---- |
| `neutral-50` | `#FAF9F9` | `(250, 249, 249)` | Secondary backgrounds |
| `neutral-100` | `#EFE8E8` | `(239, 232, 232)` | Main surface background  |
| `neutral-300` | `#CFC7C7` | `(207, 199, 199)` | Borders & Dividers |
| `surface-muted` | `#BFD6D5` | `(191, 214, 213)` | Wizard & Filter panels  |
| `neutral-900` | `#2B2B2B` | `(43, 43, 43)` | Primary Typography  |

In Google Sheets exportieren

### **D. Semantic Palette (Status Guidance)**

| Status | Token | Hex | RGB |
| :---- | :---- | :---- | :---- |
| **Success** | `success-500` | `#3C8C7A` | `(60, 140, 122)` |
| **Warning** | `warning-500` | `#C59E38` | `(197, 158, 56)` |
| **Error** | `error-500` | `#B55353` | `(181, 83, 83)` |

In Google Sheets exportieren  
---

## **4\. Dark Mode Architecture**

For high-focus professional environments, the following tokens apply:

* **Background:** `#121616` | RGB: `(18, 22, 22)`  
* **Surface:** `#1B2222` | RGB: `(27, 34, 34)`  
* **Text (Primary):** `#E7EFEF` | RGB: `(231, 239, 239)`  
* **Primary Accent:** `#3FA3A3` | RGB: `(63, 163, 163)`

---

## **5\. Builder Prompt (Developer)**

Use this configuration to update your `tailwind.config.ts` or CSS variables:

TypeScript  
/\*\*  
 \* CompliHub360 Color System v1.1  
 \* Includes RGB values for CSS variable injection  
 \*/

export const themeTokens \= {  
  primary: {  
    500: { hex: '\#097070', rgb: '9, 112, 112' },  
    600: { hex: '\#075C5C', rgb: '7, 92, 92' },  
    700: { hex: '\#054848', rgb: '5, 72, 72' },  
  },  
  accent: {  
    500: { hex: '\#D3B454', rgb: '211, 180, 84' },  
    600: { hex: '\#B89B3E', rgb: '184, 155, 62' },  
  },  
  surface: {  
    bg: { hex: '\#EFE8E8', rgb: '239, 232, 232' },  
    wizard: { hex: '\#BFD6D5', rgb: '191, 214, 213' },  
    text: { hex: '\#2B2B2B', rgb: '43, 43, 43' },  
  }  
}

// Technical Instruction:  
// Apply 'primary.500' to the 'Request Consultation' button (Primary CTA).  
// Apply 'accent.500' to 'Verified Partner' badges only.  
// Use 'surface.bg' for the main application canvas to reduce eye strain.