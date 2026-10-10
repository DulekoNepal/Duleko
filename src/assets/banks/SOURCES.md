# Bank and wallet logos

Each logo is the one published on the bank's or wallet's official website,
the same files FLITO uses (downloaded on 5-6 October 2026; the table below
is FLITO's record of where each came from). The logos are trademarks of their
owners and are shown only to identify the account someone is paying into.
Check with each bank (and eSewa's and Khalti's merchant brand guidelines)
before a wider launch, and replace a file here when a bank changes its
branding.

For Duleko each raster logo was resized to at most 160 px tall and saved as
WebP (quality 92) so the app downloads ~140 KB instead of ~600 KB; nothing
else was changed. `nabil.svg` and `khalti.svg` are the official SVGs as
downloaded. The card colour for each bank in `src/lib/banks.ts` was taken
from its logo.

| File | Bank / wallet | Source |
|---|---|---|
| nabil.svg | Nabil Bank | https://assets.nabilbank.com/uploads/logo/nabil%20logo.svg |
| nimb.webp | Nepal Investment Mega Bank | https://www.nimb.com.np/static/images/nimbl-lotus.png |
| gibl.webp | Global IME Bank | https://gibl-assets.gibl.com.np/uploads/bankIconLogo.png |
| nicasia.webp | NIC Asia Bank | https://cms.nicasiabank.com/framework/uploads/Logo/Favicon.png |
| himalayan.webp | Himalayan Bank | https://himalayanbank.com/images/HBL-Logo.jpg |
| everest.webp | Everest Bank | https://everestbankltd.com/wp-content/themes/everestbank/assets/imgs/app-icons/apple-icon-180x180.png |
| sbi.webp | Nepal SBI Bank | https://nsbl.statebank/image/layout_set_logo?img_id=5931268 |
| scb.webp | Standard Chartered Bank Nepal | https://av.sc.com/np/content/images/content/images/cropped-512x512-1-200x200.png |
| nbl.webp | Nepal Bank | https://www.nepalbank.com.np/frontend/images/favicon.png |
| rbb.webp | Rastriya Banijya Bank | https://www.rbb.com.np/frontend/images/favicon_rbb.png |
| adbl.webp | Agricultural Development Bank | https://adbl.gov.np/images/logo.png |
| kumari.webp | Kumari Bank | https://www.kumaribank.com/icons/apple-icon.png |
| laxmisunrise.webp | Laxmi Sunrise Bank | https://www.laxmisunrise.com/wp-content/uploads/2022/04/laxmi-sunrise-orange.png |
| siddhartha.webp | Siddhartha Bank | https://www.siddharthabank.com/assets/backend/uploads/Logo/logo-new.png |
| machhapuchchhre.webp | Machhapuchchhre Bank | https://assets.machbank.com/uploads/Bank%20Logos/mbl%20logos/MACH%20LOGO%20NEpali.png |
| citizens.webp | Citizens Bank International | https://cdn.esewa.com.np/ui/logos/bank_logos/citizen.png (the bank's own site refuses non-browser downloads; this is the same logo as published on eSewa's partner-bank list) |
| prime.webp | Prime Commercial Bank | https://www.primebank.com.np/logo192.png |
| nmb.webp | NMB Bank | https://www.nmb.com.np/assets/images/favicon.png |
| prabhu.webp | Prabhu Bank | https://www.prabhubank.com/uploads/new-logo2.jpg |
| sanima.webp | Sanima Bank | https://www.sanimabank.com/static/images/logo_bank.png |
| esewa.webp | eSewa | https://cdn.esewa.com.np/ui/images/esewa_og.png (the site's share image; its header logo, `common/images/esewa_logo.png`, has white lettering for the green bar and shows only the "e" on a white tile) |
| khalti.svg | Khalti | https://khalti-static.s3.ap-south-1.amazonaws.com/cloudfront-cdn/jamara/web19/images/khalti-logo.svg |

`esewa.webp` comes from FLITO's `esewa.png`, which is `esewa_og.png` (1200x630) cropped
to the logo, 886x230 from (157, 200); the pixels are unchanged apart from the resize.
