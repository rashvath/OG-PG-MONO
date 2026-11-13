# Bulk Upload Dummy Data

Use this data in the Balance Sheet -> Bulk entries box.

## Required format

`residentName,amount,YYYY-MM-DD,category,entryType,notes`

## Copy-paste data (mixed income + expense)

```csv
Aarav,9500,2026-10-01,Rent,income,October rent paid
Diya,9800,2026-10-01,Rent,income,October rent paid
Kabir,9200,2026-10-01,Rent,income,October rent paid
Meera,10000,2026-10-01,Rent,income,October rent paid
Ishaan,9700,2026-10-02,Rent,income,October rent paid
Riya,9300,2026-10-02,Rent,income,October rent paid
Aditya,9600,2026-10-02,Rent,income,October rent paid
Sara,9900,2026-10-02,Rent,income,October rent paid
Yash,9100,2026-10-03,Rent,income,October rent paid
Naina,10200,2026-10-03,Rent,income,October rent paid
Vihaan,9400,2026-10-03,Rent,income,October rent paid
Anaya,9950,2026-10-03,Rent,income,October rent paid
Arjun,9650,2026-10-04,Rent,income,October rent paid
Siya,9750,2026-10-04,Rent,income,October rent paid
Rohan,9250,2026-10-04,Rent,income,October rent paid
Myra,10050,2026-10-04,Rent,income,October rent paid
Dev,9350,2026-10-05,Rent,income,October rent paid
Kiara,10100,2026-10-05,Rent,income,October rent paid
Aryan,9150,2026-10-05,Rent,income,October rent paid
Saanvi,9850,2026-10-05,Rent,income,October rent paid
Harsh,9550,2026-10-06,Rent,income,October rent paid
Aisha,9900,2026-10-06,Rent,income,October rent paid
Kunal,9050,2026-10-06,Rent,income,October rent paid
Ira,10300,2026-10-06,Rent,income,October rent paid
Rahul,9500,2026-10-07,Rent,income,October rent paid
Tara,9800,2026-10-07,Rent,income,October rent paid
Manav,9300,2026-10-07,Rent,income,October rent paid
Pihu,10000,2026-10-07,Rent,income,October rent paid
Neel,9600,2026-10-08,Rent,income,October rent paid
Mahi,9900,2026-10-08,Rent,income,October rent paid
Manager,14500,2026-10-08,Electricity Bill,expense,Monthly power bill
Manager,4800,2026-10-09,Water Bill,expense,Water supply charges
Manager,7200,2026-10-09,Maintenance,expense,Repairs and plumbing
Manager,3500,2026-10-10,Internet,expense,Broadband recharge
Manager,2400,2026-10-10,Cleaning,expense,Housekeeping wages
Manager,5600,2026-10-11,Groceries,expense,Common kitchen supplies
Manager,3100,2026-10-11,Gas,expense,LPG refill
Manager,2900,2026-10-12,Security,expense,Security shift payment
Manager,4700,2026-10-12,Laundry,expense,Vendor settlement
Manager,2600,2026-10-12,Miscellaneous,expense,Small operational expenses
```

## Suggested sheet details

- Start date: `2026-10-01`
- End date: `2026-10-12`
- Title: `October 2026 Balance Sheet`

## Notes

- `entryType` must be exactly `income` or `expense`.
- Date must be in `YYYY-MM-DD` format.
- Amount must be a positive number.
