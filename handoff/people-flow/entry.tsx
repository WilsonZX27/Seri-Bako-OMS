import React from 'react';import{createRoot}from'react-dom/client';import{OtClaimAction}from'../../src/components/attendance/ot-ro-actions';
createRoot(document.getElementById('app')!).render(<OtClaimAction resultId="00000000-0000-4000-8000-000000000001" candidateSeconds={3600} canSubmit canApprove={false}/>);
