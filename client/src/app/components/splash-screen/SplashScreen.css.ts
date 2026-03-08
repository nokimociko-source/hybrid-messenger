import { style } from '@vanilla-extract/css';
import { color, config } from 'folds';

export const SplashScreen = style({
  minHeight: '100%',
  backgroundColor: '#0d0d0d',
  color: '#00f2ff',
});

export const SplashScreenFooter = style({
  padding: config.space.S400,
});
