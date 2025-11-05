import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { QueryProvider } from '@/providers/queryClient';
import { AppRoutes } from '@/routes/AppRoutes';

import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <ToastContainer position="bottom-right" newestOnTop closeOnClick pauseOnHover theme="dark" />
    </QueryProvider>
  );
};

export default App;
