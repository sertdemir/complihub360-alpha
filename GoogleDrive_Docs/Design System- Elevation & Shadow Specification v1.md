# **Elevation & Shadow Specification v1.0**

## 

## **The Compliance Logic (Expert)**

In a data-heavy environment, depth is not a stylistic choice—it is **Information Hierarchy**. Shadows are used to lift actionable or high-priority elements (like the **Compliance Wizard** or **Engagement Modals**) above the foundational layer of legal texts and databases. This prevents visual "flattening," where the user might miss a critical call-to-action (CTA) amidst a wall of regulatory information.

## **The MVP Requirement (Strategist)**

For our **Antigravity/Stitch** stack, we use a "Flat-Plus" approach. Most elements remain on the base layer to maintain a clean, professional "Operating System" feel. Shadows are strictly reserved for:

* **Active Interaction:** Lifting a card when hovered.  
* **Focus Areas:** Highlighting the **Results Page** sidebars or active **Wizard** panels.  
* **Overlays:** Ensuring modals (Lead requests) are clearly separated from the background content.

## **Technical Shadow Tokens (Developer Ready)**

| Token | CSS / Tailwind Value | RGB Equivalent | Applied UI Element |
| :---- | :---- | :---- | :---- |
| shadow-sm | 0 1px 2px 0 rgba(0,0,0, 0.05) | 0, 0, 0, 0.05 | Standard Result Cards, Inputs |
| shadow-md | 0 4px 6px \-1px rgba(0,0,0, 0.1) | 0, 0, 0, 0.1 | Hovered Cards, Sidebar Panels |
| shadow-lg | 0 10px 15px \-3px rgba(0,0,0, 0.1) | 0, 0, 0, 0.1 | **Compliance Wizard Shell**, Modals |
| shadow-inner | inset 0 2px 4px 0 rgba(0,0,0, 0.06) | 0, 0, 0, 0.06 | Search Fields, Active Progress Bars |

### **Color Logic for Shadows**

* **Standard Mode:** Uses neutral-900 (RGB: 43, 43, 43) at low opacity.  
* **Dark Mode:** Shadows are replaced by **Elevation Borders** (1px lighter stroke) to maintain contrast without relying on light-source logic in dark environments.

## **Usage Rules (Developer Context)**

* **Base (Level 0):** The main canvas background (neutral-100).  
* **Cards (Level 1):** Use shadow-sm. When a user hovers over a ProviderCard to initiate an engagement request, transition to shadow-md.  
* **Wizard/Modals (Level 2):** The **Adaptive Wizard** must use shadow-lg to create a focused "lightbox" effect, signaling that the user is in a state of high-intent input.

## **Builder Prompt (Developer)**

Copy this into your tailwind.config.ts to implement the CompliHub360 elevation system:

TypeScript  
/\*\* \* CompliHub360 Elevation & Shadow System v1.0  
 \* Strategically applied depth for cognitive focus  
 \*/

export const elevationTheme \= {  
  boxShadow: {  
    'sm': '0 1px 2px 0 rgba(43, 43, 43, 0.05)',  
    'md': '0 4px 6px \-1px rgba(43, 43, 43, 0.1)',  
    'lg': '0 10px 15px \-3px rgba(43, 43, 43, 0.1)',  
    'xl': '0 20px 25px \-5px rgba(43, 43, 43, 0.1)',  
    'inner': 'inset 0 2px 4px 0 rgba(43, 43, 43, 0.06)',  
    'focus': '0 0 0 3px rgba(9, 112, 112, 0.2)', // Petrol focus ring  
  }  
}

// Technical Instruction:  
// 1\. Apply 'shadow-sm' to all standard .ResultCard components.  
// 2\. Apply 'transition-shadow duration-200 hover:shadow-md' to interactive cards.  
// 3\. The .WizardShell component must always use 'shadow-lg' to dominate the viewport.  
// 4\. In Dark Mode, set boxShadow to 'none' and use 'border border-white/10' for elevation.