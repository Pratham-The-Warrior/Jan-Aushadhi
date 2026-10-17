# Datasets

| File | What it is | Source / licence |
| --- | --- | --- |
| `A_Z_medicines_dataset_of_India.csv` | Branded medicine catalogue (name, MRP, pack, composition) | Public A–Z Indian medicines dataset |
| `Product List_3_4_2026 @ 16_33_44.csv` | PMBJP generic product list with MRPs | PMBJP / Janaushadhi product list |
| `kendra_stores.csv` | Registered Jan Aushadhi Kendras (code, owner, state, district, pincode, address) | PMBJP Kendra list |
| `pincode_geo.csv` | Approximate latitude/longitude for Indian PIN codes, used to place Kendras on the map | [DataMeet pincode map](https://github.com/datameet/pincode) (derived from GeoNames), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |

## Store location precision

`kendra_stores.csv` has no coordinates. `backend/scripts/store_geocoding.ts` places each store using
`pincode_geo.csv` and records how precise that placement is in `stores.location_precision`:

| Value | Meaning |
| --- | --- |
| `geocoded` | Address-level coordinates (e.g. from a geocoding API or set by the pharmacist) |
| `pincode` | Centre of the store's own PIN code |
| `area` | Average of PIN codes sharing the first 4 digits (same postal area) |
| `district` | Average of PIN codes sharing the first 3 digits (postal sorting district) |
| `none` | No usable coordinates; store is reachable by pincode/district search only |

Distances shown to patients for anything other than `geocoded` are approximate.
