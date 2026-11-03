import React, { useEffect, useState } from 'react';
import { useLocation } from 'umi';
import './index.less';

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  const onAnimationEnd = () => {
    if (transitionStage === 'fadeOut') {
      setTransitionStage('fadeIn');
      setDisplayLocation(location);
    }
  };

  return (
    <div className={`page-transition ${transitionStage}`} onAnimationEnd={onAnimationEnd}>
      {children}
    </div>
  );
};

export default PageTransition;
