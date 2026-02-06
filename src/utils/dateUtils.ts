export const getStartOfDay = (date: Date = new Date()) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getEndOfDay = (date: Date = new Date()) => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

export const getStartOfWeek = (date: Date = new Date()) => {
  const newDate = new Date(date);
  const day = newDate.getDay();
  const diff = newDate.getDate() - day;
  newDate.setDate(diff);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getEndOfWeek = (date: Date = new Date()) => {
  const newDate = new Date(date);
  const day = newDate.getDay();
  const diff = newDate.getDate() - day + 6;
  newDate.setDate(diff);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

export const getStartOfMonth = (date: Date = new Date()) => {
  const newDate = new Date(date);
  newDate.setDate(1);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getEndOfMonth = (date: Date = new Date()) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + 1);
  newDate.setDate(0);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

export const getStartOfYear = (date: Date = new Date()) => {
  const newDate = new Date(date);
  newDate.setMonth(0);
  newDate.setDate(1);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getEndOfYear = (date: Date = new Date()) => {
  const newDate = new Date(date);
  newDate.setMonth(11);
  newDate.setDate(31);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

export const formatDate = (date: Date, _format: string = 'MMM dd, yyyy') => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const formatCurrency = (amount: number, currency: string = 'PHP') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const getMonthName = (month: number) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
};

export const getDayName = (day: number) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
};
