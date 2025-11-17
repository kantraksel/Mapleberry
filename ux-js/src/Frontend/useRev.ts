import { useState } from "react";

function useRev(): [number, () => void] {
    const [rev, setRev] = useState(0);
    return [rev, () => setRev(rev + 1)];
}
export default useRev;
