import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {login as loginApi, logout as logoutApi} from '../api/authApi';
import {getSession, saveSession} from '../api/storage';
import {apiRequest, endpoints} from './api';
import {extractList} from './dataHelpers';
import {categories as demoCategories, products as demoProducts, vendors as demoVendors} from './demoData';

const AppContext = createContext(null);
const GUEST_TOKEN = 'merrage-guest-session';

export const isGuestSession = session => Boolean(session?.user?.isGuest || session?.token === GUEST_TOKEN);

export function AppProvider({children}) {
  const [session, setSessionState] = useState(getSession);
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [localProducts, setLocalProducts] = useState(demoProducts);
  const [localCategories, setLocalCategories] = useState(demoCategories);
  const [loadingCount, setLoadingCount] = useState(0);
  const toastTimer = useRef(null);

  const setSession = useCallback(next => {
    setSessionState(next);
    saveSession(next);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToast(null);
  }, []);

  const notify = useCallback((message, tone = 'success') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({message, tone});
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, tone === 'error' ? 5200 : 3800);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession(null);
      notify('Your session expired. Please sign in again.', 'error');
    };
    window.addEventListener('merrage:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('merrage:unauthorized', handleUnauthorized);
  }, [notify, setSession]);

  useEffect(() => {
    const handleApiLoading = event => {
      setLoadingCount(count => Math.max(0, count + (event.detail?.active ? 1 : -1)));
    };
    window.addEventListener('merrage:api-loading', handleApiLoading);
    return () => window.removeEventListener('merrage:api-loading', handleApiLoading);
  }, []);

  useEffect(() => {
    if (session && !session.token) {
      setSession(null);
      notify('Please sign in again to continue.', 'error');
    }
  }, [notify, session, setSession]);

  useEffect(() => {
    if (!session?.token || isGuestSession(session)) return;
    apiRequest(endpoints.categories, {token: session.token})
      .then(response => {
        const categories = extractList(response);
        if (categories.length) setLocalCategories(categories);
      })
      .catch(error => notify(error.message || 'Unable to load categories.', 'error'));
  }, [notify, session]);

  const login = async credentials => {
    const nextSession = await loginApi(credentials);
    setSession(nextSession);
    notify('Signed in successfully.');
    return nextSession;
  };

  const guestLogin = () => {
    const nextSession = {
      token: GUEST_TOKEN,
      user: {
        userId: 'guest',
        name: 'Guest User',
        phone: '',
        email: 'guest@merrage.local',
        address: 'Preview account',
        role: 'customer',
        isGuest: true,
        profileImage: '/assets/image/Wedding.jpg',
      },
    };
    setSession(nextSession);
    notify('Signed in as guest.');
    return nextSession;
  };

  const logout = () => {
    logoutApi();
    setSession(null);
    notify('Signed out.');
  };

  const updateSessionUser = user =>
    setSession({...session, user: {...session.user, ...user}});

  const addToCart = product => {
    setCart(items => {
      const found = items.find(item => item._id === product._id);
      return found
        ? items.map(item => item._id === product._id ? {...item, quantity: item.quantity + 1} : item)
        : [...items, {...product, quantity: 1}];
    });
    notify('Added to cart');
  };

  const value = {
    session, setSession, login, guestLogin, logout, updateSessionUser, toast, notify, dismissToast,
    cart, setCart, addToCart, orders, setOrders,
    localProducts, setLocalProducts, localCategories, setLocalCategories,
    loading: loadingCount > 0,
    demoVendors,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
