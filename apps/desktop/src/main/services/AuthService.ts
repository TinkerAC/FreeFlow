import axios from 'axios';


/**
 * @deprecated Hifini Was Dead.
 * @param cookies
 */
// Check if the Hifini cookies are expired, taking the cookie dictionary as input
export async function is_hifini_cookies_expired(cookies: { [key: string]: string }): Promise<boolean> {


  return false; // Hifini Was Dead, so we return false directly.
  // Convert cookie object to a string
  const cookieString = Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ');

  // Making request to the hifini api to check if the cookies are expired
  const url = 'https://www.hifini.com/';

  try {
    // Making a get request to the hifini api
    const response = await axios.get(url, { headers: { Cookie: cookieString } });

    // If the response has "请登录后查看"
    if (response.data.includes('请登录后查看')) {
      // Return true
      console.log(`Cookies ${cookieString} are expired`);
      return true;
    } else {
      // Return false
      console.log(`Cookies ${cookieString} are not expired`);
      return false;
    }
  } catch (error) {
    console.error('Error checking cookies:', error);
    return false;
  }


}

