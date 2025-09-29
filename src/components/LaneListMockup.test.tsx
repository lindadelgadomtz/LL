import { render, screen, within } from '@testing-library/react';
import LaneListMockup from './LaneListMockup';

test('renders brand in header', () => {
    render(<LaneListMockup />);
    const header = screen.getByRole('banner'); // <header>
    expect(
        within(header).getByRole('heading', { name: /LaneList/i })
    ).toBeInTheDocument();
});
