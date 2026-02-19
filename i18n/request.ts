import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'ar'] as const;

// next-intl v4: requestLocale is a Promise<string | undefined>
export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(locales, requested) ? requested : 'en';

    return {
        locale,
        messages: (await import(`@/messages/${locale}.json`)).default,
    };
});
