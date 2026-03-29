# **Border & Stroke Specification v1.1**

## 

## **The Compliance Logic (Expert)**

In the context of **Compliance Orchestration**, borders are not just decorative; they are **functional containers**. As detailed in the *Brand & Positioning Guide*, our goal is to convey "Authority \+ Precision." Clear strokes help users mentally "file" regulatory data, such as VAT thresholds or GDPR risks, into distinct, manageable compartments, preventing the overwhelming feeling of "legal text walls."

## **The MVP Requirement (Strategist)**

For our **Antigravity/Stitch** stack, we utilize a standardized stroke system to maintain high performance and clean UI logic.

* **Separation:** Use border-thin for the **Results Page** cards to keep the information architecture light yet structured.  
* **Focus:** Use border-medium with the **Petrol (primary-500)** color for active inputs in the **Compliance Wizard** to provide high-visibility feedback—critical for error prevention in legal forms.

## **Technical Specifications**

### **A. Border Radius (Geometry)**

*Usage: Designed to look modern but not "playful".*

| Token | Value | Applied UI Element |
| :---- | :---- | :---- |
| radius-xs | 2px | Micro-elements / Indicators |
| radius-sm | 4px | Tooltips / Small tags |
| **radius-md** | **8px** | **Inputs, Buttons** (Core Action Elements) |
| **radius-lg** | **12px** | **Cards, Modals, Wizard Panels** |
| radius-xl | 16px | Large dashboard modules |
| radius-pill | 999px | **Badges** (Partner, Status, VAT-Verified) |

### 

### **Border Tokens (Thickness)**

| Token | Value | Applied UI Element |
| :---- | :---- | :---- |
| **border-thin** | 1px | **Cards, Tables, Input Borders** |
| **border-medium** | 2px | **Focus States**, Hover effects for interactive cards |
| **border-thick** | 3px | Heavy structural dividers (rare usage) |

### 

### **Border Colors**

Mapped to the **Core Color Tokens** for architectural consistency:

* **border-default**: \#E2DADA (neutral-200) \- Standard boundaries.  
* **border-muted**: \#EFE8E8 (neutral-100) \- Subtle separators within cards.  
* **border-strong**: \#CFC7C7 (neutral-300) \- High-contrast dividers.  
* **border-focus**: \#097070 (primary-500) \- Active state for **Petrol** brand colors

## **Layout Application (Developer Context)**

* **Results Page:** ResultCards must use border-thin and radius-lg to match the "Premium Neutral" feel.  
* **Navigation:** Navigation dividers use border-muted.  
* **Search Bar:** Uses radius-md (8px) and transitions to border-medium \+ border-focus upon interaction.

## **Builder Prompt (Developer)**

TypeScript  
/\*\* \* CompliHub360 Border & Stroke System v1.1  
 \* Precision-engineered for Compliance Platforms  
 \*/

export const borderTheme \= {  
  borderRadius: {  
    'xs': '2px',  
    'sm': '4px',  
    'md': '8px',   // Applied to Inputs and Buttons  
    'lg': '12px',  // Applied to ResultCards and Wizard Panels  
    'xl': '16px',  
    'pill': '999px', // Exclusive for Badges (e.g., "Verified Partner")  
  },  
  borderWidth: {  
    'DEFAULT': '1px',  
    'thin': '1px',  
    'medium': '2px', // Use for :focus and :active states  
    'thick': '3px',  
  },  
  borderColor: {  
    'default': '\#E2DADA', // neutral-200  
    'muted': '\#EFE8E8',   // neutral-100  
    'strong': '\#CFC7C7',  // neutral-300  
    'focus': '\#097070',   // primary-500 (Petrol)  
  }  
}

// Builder Instruction:  
// 1\. All wizard-step components must inherit 'radius-lg' for the outer shell.  
// 2\. Form inputs must use 'radius-md' and toggle to 'border-medium border-focus' on select.  
// 3\. Monetized 'Featured Partner' cards should retain 'border-thin' but can use 'accent-500' (Gold) for the border-color to signal premium status.