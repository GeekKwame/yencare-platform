export function ghanaPhoneDigits(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  while (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("2330") && digits.length === 13) {
    digits = `233${digits.slice(4)}`;
  }
  if (digits.startsWith("0233") && digits.length === 13) {
    digits = digits.slice(1);
  }
  if (digits.startsWith("233") && digits.length === 12) return digits.slice(3);
  if (digits.startsWith("0") && digits.length === 10) return digits.slice(1);
  if (digits.length === 9) return digits;
  return digits;
}

export function phonesMatch(left, right) {
  const a = ghanaPhoneDigits(left);
  const b = ghanaPhoneDigits(right);
  return a.length >= 9 && b.length >= 9 && a.slice(-9) === b.slice(-9);
}
