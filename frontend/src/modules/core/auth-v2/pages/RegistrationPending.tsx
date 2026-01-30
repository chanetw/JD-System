/**
 * Registration Pending Page for V2 Auth System
 *
 * Displays "Request Received" message after user submits registration.
 * Informs user that their application is pending admin review.
 */

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '../../stores/authStoreV2';

const RegistrationPending: React.FC = () => {
  const navigate = useNavigate();
  const { registrationResult, isAuthenticated, clearRegistrationState } = useAuthStoreV2();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // If no registration result and not pending, redirect to register
  useEffect(() => {
    if (!registrationResult) {
      // Allow viewing this page directly (e.g., from email link)
      // navigate('/register-request', { replace: true });
    }
  }, [registrationResult, navigate]);

  // Clear registration state when leaving the page
  useEffect(() => {
    return () => {
      // Don't clear immediately - let the page be shown
    };
  }, []);

  const handleBackToLogin = () => {
    clearRegistrationState();
    navigate('/login-v2');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Success Card */}
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Registration Request Submitted
          </h1>

          {/* Subtitle */}
          <p className="text-gray-600 mb-6">
            Your application has been submitted successfully.
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-500 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  What happens next?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your registration is pending review by our staff</li>
                    <li>You will receive an email once your account is approved</li>
                    <li>After approval, you can sign in with your credentials</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Details (if available) */}
          {registrationResult && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Registration Details
              </h4>
              <dl className="text-sm">
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Email:</dt>
                  <dd className="text-gray-900 font-medium">{registrationResult.email}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Status:</dt>
                  <dd className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {registrationResult.status}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Contact Info */}
          <p className="text-sm text-gray-500 mb-6">
            If you have any questions, please contact your administrator.
          </p>

          {/* Action Button */}
          <button
            onClick={handleBackToLogin}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Back to Login
          </button>

          {/* Submit Another */}
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Need to submit another request? </span>
            <Link
              to="/register-request"
              onClick={clearRegistrationState}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Register again
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            DJ System - Design Job Management
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPending;
