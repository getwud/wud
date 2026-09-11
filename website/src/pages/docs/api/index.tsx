import React from 'react';
import { Redirect } from '@docusaurus/router';

export default function ApiRedirect(): React.JSX.Element {
  return <Redirect to="/docs/api/reference/wud-rest-api" />;
}
