import { CustomOpenApi } from "@/apis";

const getToken = async () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ainee_token');
    return token ? token : '';
  }
  return '';
};

const ApiLibs = new CustomOpenApi({
  BASE: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.ainee.com",
  TOKEN: getToken,
});

export default ApiLibs;
