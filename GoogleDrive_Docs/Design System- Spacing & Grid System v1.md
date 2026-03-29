# **Spacing & Grid System v1**

## 

## **The Compliance Logic (Expert)**

In a high-stakes "Advisory Layer," white space serves as a critical tool for reducing cognitive load. By implementing a rigorous, predictable spacing system, we prevent the UI from feeling cluttered or overwhelming, conveying the technical precision and reliability essential for global compliance orchestration.

## **The MVP Requirement (Strategist)**

For our **Antigravity/Stitch** stack, we utilize an **8px Base Grid** to ensure architectural consistency across the platform. This enables rapid development and prevents "layout drift," ensuring that the **Adaptive Wizard**, **Results Page**, and **Dashboard** align perfectly across all viewport sizes.

**Technical Specifications**

### **A. Base Grid Logic**

* **Base-Unit**: 8px (Primary increment for all layout components).  
* **Micro-Unit**: 4px (Reserved for micro-alignments, such as icon positioning or internal badge spacing).

### **B. Spacing Tokens**

| Token | Value | Primary UI Usage |
| :---- | :---- | :---- |
| space-0 | 0px | Reset / No spacing |
| space-1 | 4px | Micro-adjustments (Icons, tiny labels) |
| space-2 | 8px | Tight clusters, Button Vertical Padding |
| space-3 | 12px | Compact component internal gaps |
| space-4 | 16px | Standard Button Horizontal Padding, Small Gaps |
| space-5 | 20px | List item spacing |
| space-6 | 24px | **Default Card Padding**, Wizard Step Gaps |
| space-7 | 32px | **Default Panel Padding**, Sidebar Gaps |
| space-8 | 40px | Large component spacing |
| space-9 | 48px | Subsection headers |
| space-10 | 64px | **Section Spacing (Min)** |
| space-11 | 80px | Transition areas |
| space-12 | 96px | **Section Spacing (Max)** |

## **4\. Layout Application (Developer Context)**

| UI Element | Spacing Logic |
| :---- | :---- |
| **Button Padding** | 8px (Vertical) / 16px (Horizontal) |
| **Card Padding** | 24px internal padding for all ResultCard variants  |
| **Panel Padding** | 32px internal padding for Dashboard and Wizard shells  |
| **Wizard Step Gap** | 24px vertical gap between input steps  |
| **Section Spacing** | 64px to 96px vertical margin between landing page sections |

## **5\. Builder Prompt (Developer)**

Copy this configuration into your tailwind.config.ts or CSS variables to initialize the **Antigravity Spacing System**:

TypeScript

/\*\*

 \* CompliHub360 Spacing System v1.2

 \* 8px Base Grid Logic \- Radius Specs Removed

 \*/

export const spacingTheme \= {

  spacing: {

    '0': '0px',

    '1': '4px',

    '2': '8px',

    '3': '12px',

    '4': '16px',

    '5': '20px',

    '6': '24px',  // Standard Card Padding

    '7': '32px',  // Standard Panel Padding

    '8': '40px',

    '9': '48px',

    '10': '64px', // Section Spacing (Start)

    '11': '80px',

    '12': '96px', // Section Spacing (End)

  },

}

// Technical Instruction:

// 1\. Maintain a 'gap-6' for the Compliance Wizard's functional flow.

// 2\. Use 'p-6' for all ResultGrid cards to ensure content "breathes."

// 3\. Apply 'py-10' or 'py-12' for layout sectioning to reduce visual noise.