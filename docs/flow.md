# NestPG Flow

This document explains the primary user and system flows for the NestPG platform.

## 1. High-Level Product Flow

```mermaid
flowchart TD
    A[User lands on Home] --> B[Search by Area + Gender]
    B --> C[Open Listings]
    C --> D[Open PG Detail]
    D --> E[Submit Enquiry]

    F[Owner Login] --> G[Owner Dashboard]
    G --> H[Edit Assigned PG]
    G --> I[Add Residents]
    G --> J[Track Payments and Settlement]

    K[Admin Login] --> L[Admin Dashboard]
    L --> M[Create and Manage PGs]
    L --> N[Create and Manage Owners]
    L --> O[Assign PGs to Owners]
    L --> P[Monitor Residents and Mark Left]
```

## 2. PG Creation and Update Flow (Admin and Owner)

```mermaid
flowchart TD
    A[Open PG Form Dialog] --> B[Fill PG Details]
    B --> C[Select Location on Map]
    C --> D{Inside Bengaluru Boundary?}
    D -- No --> E[Show Error and Reject Selection]
    D -- Yes --> F[Set Map URL + Latitude + Longitude]
    F --> G[Reverse Geocode Area]
    G --> H[Auto Fill / Validate Area]
    H --> I[Fill 7-Day Weekly Menu]
    I --> J[Upload or Paste Image URLs]
    J --> K[Submit Form]
    K --> L[API Validates Coordinates + Payload]
    L --> M[Save Listing]
```

## 3. Resident Lifecycle Flow

```mermaid
flowchart TD
    A[Owner Adds Resident] --> B[Store Joining Date + Rent + Deposit + Paid]
    B --> C[Resident Active]
    C --> D[Track Due and Payments]
    D --> E[Admin/Owner Marks Resident Left]
    E --> F[Set Final Settlement Amount]
    F --> G[Set Settlement Paid Status]
```

## 4. Enquiry Flow

```mermaid
flowchart TD
    A[Customer Submits Enquiry] --> B[Enquiry Saved in API]
    B --> C[Visible to Owner and Admin]
    C --> D[Status Updated: New/Contacted/Closed]
```

## 5. Validation Rules Summary

- Phone inputs: restricted to 10 digits in forms.
- Number fields: spinner arrows removed; typing is flexible.
- Map selection: restricted to Bengaluru bounds.
- Coordinates: validated in frontend and backend before save.
- Weekly menu: 7-day menu is required.
- Image URLs: sanitized and limited.

## 6. Technical Layers

```mermaid
flowchart LR
    A[React + TypeScript Frontend] --> B[API Client Layer]
    B --> C[Express Routes]
    C --> D[Zod Validation]
    D --> E[Mongoose Models]
    E --> F[MongoDB]
```

## 7. Notes

- Home and Listings are customer-facing discovery pages.
- Owner can update assigned PG details and manage residents.
- Admin controls platform-level listing, owner, and resident operations.
