import {createContext, useCallback, useContext, useState} from 'react';
import {apiRequest, endpoints, unwrap} from './api';
import {categories as demoCategories, demoCustomer, demoVendor, products as demoProducts, vendors as demoVendors} from './demoData';

const AppContext = createContext(null);
const SESSION_KEY = 'merrage-web-session';

const getStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
};

export function AppProvider({children}) {
  const [session, setSessionState] = useState(getStoredSession);
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [localProducts, setLocalProducts] = useState(demoProducts);
  const [localCategories, setLocalCategories] = useState(demoCategories);

  const setSession = next => {
    setSessionState(next);
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  };

  const notify = useCallback((message, tone = 'success') => {
    setToast({message, tone});
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const login = async ({phone, password, role}) => {
    try {
      const response = await apiRequest(endpoints.login, {
        method: 'POST',
        body: JSON.stringify({phone, password}),
      });
      setSession({user: unwrap(response), token: response.token});
    } catch {
      setSession({user: role === 'vendor' ? demoVendor : demoCustomer, token: 'demo-token'});
      notify('Demo session opened. Live API was unavailable.', 'info');
    }
  };

  const logout = () => setSession(null);

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
    session, setSession, login, logout, updateSessionUser, toast, notify,
    cart, setCart, addToCart, orders, setOrders,
    localProducts, setLocalProducts, localCategories, setLocalCategories,
    demoVendors,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
