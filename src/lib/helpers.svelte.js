// Returns a performance timestamp to be passed to tLog()
export const t = () => performance.now();

// Logs label + elapsed time formatted to 3 significant figures
export const tLog = (label, start) =>
  console.log(`${label}: ${Number((performance.now() - start).toPrecision(3))} ms`);
