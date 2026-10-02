import React, { useState } from 'react';
import {
  Code2,
  Play,
  Terminal,
  Copy,
  Check,
  Globe,
  Server,
  Layers,
  Shield,
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';

export const ApiDocsExplorer: React.FC = () => {
  const { servers, accounts, plans, invoices, jobs } = useServer();
  const { currentUser } = useAuth();
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('GET /api/v1/servers');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const ENDPOINTS = [
    { method: 'GET', path: '/api/v1/servers', tag: 'Infrastructure', desc: 'Retrieve all server nodes and daemon statuses' },
    { method: 'GET', path: '/api/v1/accounts', tag: 'Provisioning', desc: 'List all hosting virtual host accounts' },
    { method: 'POST', path: '/api/v1/accounts/provision', tag: 'Provisioning', desc: 'Auto-provision new vHost, DNS, DB, and SSL' },
    { method: 'POST', path: '/api/v1/accounts/:id/ssl/issue', tag: 'Security', desc: 'Request Let\'s Encrypt AutoSSL certificate' },
    { method: 'GET', path: '/api/v1/billing/invoices', tag: 'Billing', desc: 'List client invoices and payment states' },
    { method: 'GET', path: '/api/v1/queue/jobs', tag: 'System', desc: 'Poll background worker tasks and progress' },
  ];

  const handleExecute = () => {
    const start = performance.now();

    let data: any = {};
    let status = 200;

    switch (selectedEndpoint) {
      case 'GET /api/v1/servers':
        data = {
          success: true,
          timestamp: new Date().toISOString(),
          total_nodes: servers.length,
          data: servers.map(s => ({
            id: s.id,
            name: s.name,
            hostname: s.hostname,
            ip: s.ipAddress,
            location: s.location,
            status: s.status,
            load: s.loadAverage,
            daemons: s.services.map(svc => ({ name: svc.name, status: svc.status, port: svc.port })),
          })),
        };
        break;

      case 'GET /api/v1/accounts':
        data = {
          success: true,
          timestamp: new Date().toISOString(),
          total: accounts.length,
          data: accounts.map(a => ({
            id: a.id,
            domain: a.primaryDomain,
            username: a.username,
            ip: a.ipAddress,
            php_version: a.phpVersion,
            ssl: a.sslStatus,
            status: a.status,
          })),
        };
        break;

      case 'POST /api/v1/accounts/provision':
        status = 201;
        data = {
          success: true,
          status: 'ENQUEUED',
          job_id: 'job-prov-' + Math.random().toString(36).substring(2, 7),
          message: 'Provisioning task has been sent to cluster async queue worker.',
          allocated_node: 'sg-node-01.cloudpro.net',
        };
        break;

      case 'POST /api/v1/accounts/:id/ssl/issue':
        status = 200;
        data = {
          success: true,
          status: 'ISSUING',
          challenge_type: 'ACME HTTP-01',
          authority: "Let's Encrypt Authority X3",
          message: 'Certificate request submitted successfully.',
        };
        break;

      case 'GET /api/v1/billing/invoices':
        data = {
          success: true,
          timestamp: new Date().toISOString(),
          total: invoices.length,
          data: invoices,
        };
        break;

      case 'GET /api/v1/queue/jobs':
        data = {
          success: true,
          total_active: jobs.filter(j => j.status === 'processing').length,
          jobs: jobs.slice(0, 5),
        };
        break;

      default:
        data = { success: true };
    }

    const elapsed = +(performance.now() - start).toFixed(2);
    setStatusCode(status);
    setResponseTime(elapsed);
    setApiResponse(JSON.stringify(data, null, 2));
  };

  const getCurlSnippet = () => {
    const [method, path] = selectedEndpoint.split(' ');
    return `curl -X ${method} "https://panel.cloudpro.net${path}" \\
  -H "Authorization: Bearer cpro_live_99a8*******************" \\
  -H "Content-Type: application/json"`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(getCurlSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-purple-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cloud PRO REST API Documentation & Test Console
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Integrasikan WHMCS, billing otomatis, CI/CD pipelines, dan sistem eksternal menggunakan API JSON kami.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Endpoints Nav List */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-1 space-y-1 text-xs">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-2">
            Available API Endpoints
          </h4>
          {ENDPOINTS.map(ep => {
            const key = `${ep.method} ${ep.path}`;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedEndpoint(key);
                  setApiResponse('');
                  setStatusCode(null);
                }}
                className={`flex w-full flex-col items-start rounded-lg p-2.5 text-left transition-colors ${
                  selectedEndpoint === key
                    ? 'bg-purple-50 text-purple-900 font-semibold dark:bg-purple-950/60 dark:text-purple-200'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                      ep.method === 'GET'
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs">{ep.path}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{ep.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Interactive Try-it-out Terminal */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
              {selectedEndpoint}
            </div>
            <button
              onClick={handleExecute}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 shadow-xs"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Test API Call (Try it Out)</span>
            </button>
          </div>

          {/* cURL Snippet */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>cURL Request:</span>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-white"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Tersalin' : 'Salin cURL'}</span>
              </button>
            </div>
            <pre className="rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto">
              {getCurlSnippet()}
            </pre>
          </div>

          {/* Response Box */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Response Output:</span>
              {statusCode !== null && (
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-emerald-500 font-bold">{statusCode} OK</span>
                  <span>&bull;</span>
                  <span>{responseTime} ms</span>
                </div>
              )}
            </div>
            <pre className="rounded-lg bg-slate-950 p-4 font-mono text-xs text-sky-300 min-h-[160px] max-h-[300px] overflow-y-auto scrollbar-thin">
              {apiResponse || '// Klik "Test API Call" di atas untuk melihat respon langsung...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
