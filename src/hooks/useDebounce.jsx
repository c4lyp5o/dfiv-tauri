import { useState, useEffect } from "react";

const useDebounce = (value, delay) => {
	// State to store the debounced value
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		// Set a timer to update the debounced value after the delay
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		// Cleanup function: This will be called before the effect is re-run.
		// It clears the previous timer if the value or delay changes.
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]); // Only re-call effect if value or delay changes

	return debouncedValue;
};

export default useDebounce;
