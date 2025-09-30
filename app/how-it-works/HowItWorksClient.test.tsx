import { render, screen } from '@testing-library/react';
// ⬇️ Adjust this import to where your component actually is:
import HowItWorks from './HowItWorksClient';
// Examples:
// import HowItWorks from '../page';              // if your page is a client component
// import HowItWorks from '@/src/pages/HowItWorks'; // if using src/pages

describe('HowItWorks page', () => {
    test('renders hero heading and key badges', () => {
        render(<HowItWorks />);

        // Hero title
        expect(
            screen.getByRole('heading', { name: /how lanelist works/i })
        ).toBeInTheDocument();

        // Badges / key selling points
        expect(screen.getByText(/verification available/i)).toBeInTheDocument();
        expect(screen.getByText(/eu focus/i)).toBeInTheDocument();
    });

    test('shows the 4 steps', () => {
        render(<HowItWorks />);

        // Step headings
        expect(screen.getByRole('heading', { name: /filter/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /match/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /compare/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument();
    });

    test('has a CTA to list company', () => {
        render(<HowItWorks />);
        // There are two CTAs in the page; get the first/any
        const ctas = screen.getAllByRole('button', { name: /list your company/i });
        expect(ctas.length).toBeGreaterThan(0);
    });

    test('renders FAQ section with a sample question', () => {
        render(<HowItWorks />);
        expect(
            screen.getByRole('heading', { name: /frequently asked questions/i })
        ).toBeInTheDocument();

        // One of the FAQ entries
        expect(screen.getByText(/is lanelist free\\?/i)).toBeInTheDocument();
    });
});
