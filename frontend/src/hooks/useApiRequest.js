import { useState } from "react";

export function useApiRequest(requestFn) {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function run(...args) {
    setStatus("loading");
    setError(null);
    try {
      const result = await requestFn(...args);
      setData(result);
      setStatus("success");
      return result;
    } catch (err) {
      setError(err);
      setStatus("error");
      throw err;
    }
  }

  return { run, status, data, error };
}