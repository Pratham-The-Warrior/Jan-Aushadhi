// ============================================================
// Info Pages — About, Privacy, Terms
// Plain-language pages linked from the footer and account menu.
// NOTE: Privacy and Terms describe what the app actually does today;
// have them reviewed by a lawyer before a public launch.
// ============================================================

import { Link, useParams } from 'react-router-dom';
import NotFound from './NotFound';

const PAGES = {
  about: {
    title: 'About this service',
    sections: [
      ['What we do', 'We help you find the Jan Aushadhi generic medicine with the same active ingredients as your branded medicine, show how much you can save, and connect you to a nearby Jan Aushadhi Kendra.'],
      ['Who we are', 'This is an independent service. It is not run by the Government of India, the Department of Pharmaceuticals or PMBI. Jan Aushadhi Kendras are independently operated pharmacies under the Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP).'],
      ['How matching works', 'We compare each medicine\'s active ingredients, strength, dosage form (tablet, syrup, injection…) and release type (for example, sustained release). "Exact match" means all of these are the same. "Same dose, different form" and "Not a direct substitute" are shown with the reason — always check with your doctor or pharmacist before switching.'],
      ['Where the data comes from', 'Generic medicines and prices come from the PMBJP product list. Branded medicine data comes from a public dataset of Indian medicines and may contain errors. Kendra locations are approximate (based on PIN code) unless marked otherwise. Map data © OpenStreetMap contributors; PIN code locations from DataMeet (CC BY 3.0).'],
    ],
  },
  privacy: {
    title: 'Privacy',
    sections: [
      ['What we collect', 'Your mobile number or Google account when you sign in, the medicines you order, the Kendra you choose, and — for delivery only — the address and location you share so we can route your order to the nearest Kendra.'],
      ['How we use it', 'To place and track your orders, show your savings, and let the Kendra contact you on WhatsApp about your order. We do not sell your data.'],
      ['Who can see it', 'The Kendra you order from sees your order, name and phone number. Our administrators can see orders to resolve problems.'],
      ['Your choices', 'You can use search, price comparison and the store locator without an account. To delete your account and order history, contact us.'],
    ],
  },
  terms: {
    title: 'Terms of use',
    sections: [
      ['Not medical advice', 'Information on this site is for reference only. Do not change, stop or substitute a medicine without talking to your doctor or pharmacist.'],
      ['Prescriptions', 'Prescription medicines are dispensed only against a valid prescription from a registered medical practitioner, checked by the pharmacist at the Kendra.'],
      ['Orders and payment', 'Your order is a request to the Kendra. The Kendra confirms availability and the final amount, and you pay the Kendra directly. Prices shown are MRPs from the PMBJP list and may change.'],
      ['Accuracy', 'We work hard to keep medicine matches and store details correct, but data can be incomplete. Please report anything that looks wrong.'],
    ],
  },
};

export default function InfoPage() {
  const { page } = useParams();
  const content = PAGES[page];
  if (!content) return <NotFound />;

  return (
    <div className="flex-1 w-full bg-surface">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface mb-10">{content.title}</h1>
        <div className="space-y-8">
          {content.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="font-display text-lg font-bold text-on-surface mb-2">{heading}</h2>
              <p className="text-on-surface/75 leading-relaxed">{body}</p>
            </section>
          ))}
        </div>
        <nav className="mt-14 pt-6 border-t border-outline-variant flex flex-wrap gap-6 text-sm font-semibold text-primary">
          {Object.entries(PAGES).filter(([key]) => key !== page).map(([key, p]) => (
            <Link key={key} to={`/info/${key}`} className="hover:underline">{p.title}</Link>
          ))}
        </nav>
      </article>
    </div>
  );
}
