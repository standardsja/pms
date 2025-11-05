import React from 'react';
import { Request } from '../types/request.types';

interface Props {
    request: Request;
}

const currency = (n: number) => `$${n.toFixed(2)}`;

const RequestDetailsContent: React.FC<Props> = ({ request }) => {
    return (
        <div className="text-left space-y-4">
            <div>
                <h3 className="font-semibold text-lg mb-2">{request.title}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Requester:</span> {request.requester}</div>
                    <div><span className="font-medium">Department:</span> {request.department}</div>
                    <div><span className="font-medium">Date Submitted:</span> {request.date}</div>
                    <div><span className="font-medium">Status:</span> {request.status}</div>
                </div>
            </div>

            <div>
                <h4 className="font-semibold mb-2">Budget Information</h4>
                <div className="text-sm space-y-1">
                    <div><span className="font-medium">Total Amount:</span> <span className="text-lg font-bold text-blue-600">{currency(request.totalEstimated)}</span></div>
                    <div><span className="font-medium">Funding Source:</span> {request.fundingSource || '—'}</div>
                    <div><span className="font-medium">Budget Code:</span> {request.budgetCode || '—'}</div>
                </div>
            </div>

            <div>
                <h4 className="font-semibold mb-2">Items/Services</h4>
                <table className="w-full text-sm border-collapse border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Description</th>
                            <th className="px-3 py-2 text-center">Qty</th>
                            <th className="px-3 py-2 text-right">Unit Price</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {request.items.map((item, idx) => (
                            <tr className="border-t" key={idx}>
                                <td className="px-3 py-2 text-left">{idx + 1}</td>
                                <td className="px-3 py-2 text-left">{item.description}</td>
                                <td className="px-3 py-2 text-center">{item.quantity}</td>
                                <td className="px-3 py-2 text-right">{currency(item.unitPrice)}</td>
                                <td className="px-3 py-2 text-right font-medium">{currency(item.quantity * item.unitPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div>
                <h4 className="font-semibold mb-2">Justification</h4>
                <p className="text-sm bg-gray-50 p-3 rounded whitespace-pre-wrap">{request.justification}</p>
            </div>

            <div>
                <h4 className="font-semibold mb-2">Comments & Feedback</h4>
                {request.comments.length > 0 ? (
                    request.comments.map((c, i) => (
                        <div className="p-3 bg-gray-50 rounded mb-2" key={i}>
                            <div className="font-medium text-sm">{c.actor} <span className="text-gray-500 font-normal">on {c.date}</span></div>
                            <div className="text-sm mt-1 whitespace-pre-wrap">{c.text}</div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-sm">No comments yet.</p>
                )}
            </div>

            <div>
                <h4 className="font-semibold mb-2">Status History</h4>
                <div className="text-sm border rounded p-3">
                    {request.statusHistory.map((h, i) => (
                        <div className="flex justify-between items-start py-2 border-b last:border-0" key={i}>
                            <div>
                                <div className="font-medium text-sm">{h.status}</div>
                                <div className="text-xs text-gray-500">{h.note}</div>
                            </div>
                            <div className="text-xs text-gray-500 text-right">
                                <div>{h.actor}</div>
                                <div>{h.date}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RequestDetailsContent;
