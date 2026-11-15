import { createContext, use } from 'react';

// The open trip's id, shared by the trip's tabs (a tab opened by tapping it
// doesn't get the id in its own route params).
export const TripIdContext = createContext<string>('');
export const useTripId = () => use(TripIdContext);
