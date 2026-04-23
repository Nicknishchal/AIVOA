import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import MainScreen from './components/MainScreen';
import './index.css';

function App() {
  return (
    <Provider store={store}>
      <div className="h-screen w-full overflow-hidden">
        <MainScreen />
      </div>
    </Provider>
  );
}

export default App;
