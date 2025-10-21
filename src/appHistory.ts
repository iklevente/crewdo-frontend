/* eslint-disable no-restricted-imports */
import { useLocation, useNavigate } from 'react-router-dom';

export const useAppNavigate = (): ReturnType<typeof useNavigate> => useNavigate();

export const useAppLocation = (): ReturnType<typeof useLocation> => useLocation();
