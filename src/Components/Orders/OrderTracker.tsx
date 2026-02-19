import React from 'react';
import styled from 'styled-components';
import { FaCheck } from 'react-icons/fa';

interface TimelineStep {
    status: string; // 'placed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'
    label: string;
    date?: string;
    isCompleted: boolean;
    isCurrent: boolean;
}

interface OrderTrackerProps {
    currentStatus: string;
    deliveryStatus?: string;
    timeline?: { status: string; timestamp: string }[];
}

const OrderTracker: React.FC<OrderTrackerProps> = ({ currentStatus, deliveryStatus, timeline = [] }) => {
    const steps = [
        { key: 'placed', label: 'Order Placed' },
        { key: 'shipped', label: 'Shipped' },
        { key: 'out_for_delivery', label: 'Out for Delivery' },
        { key: 'delivered', label: 'Delivered' },
    ];

    // Helper to find if a step is completed based on current status
    const getStepStatus = (stepKey: string, current: string, deliveryStat?: string) => {
        const orderStatusOrder = ['placed', 'shipped', 'out_for_delivery', 'delivered'];

        let effectiveStatus = current.toLowerCase();

        // If we have a specific delivery status from iCarry, map it to our internal status if valid
        if (deliveryStat) {
            const ds = deliveryStat.toLowerCase();
            if (ds === 'booked') effectiveStatus = 'placed'; // Or shipped if booked means label created
            if (ds === 'in_transit' || ds === 'shipped') effectiveStatus = 'shipped';
            if (ds === 'out_for_delivery') effectiveStatus = 'out_for_delivery';
            if (ds === 'delivered') effectiveStatus = 'delivered';
        }

        const currentIndex = orderStatusOrder.indexOf(effectiveStatus);
        const stepIndex = orderStatusOrder.indexOf(stepKey);

        if (effectiveStatus === 'cancelled') {
            return { isCompleted: stepKey === 'placed', isCurrent: false, isCancelled: true };
        }

        return {
            isCompleted: stepIndex <= currentIndex,
            isCurrent: stepIndex === currentIndex,
            isCancelled: false
        };
    };

    // Merge predefined steps with actual timeline data if available
    const timelineSteps = steps.map((step) => {
        const { isCompleted, isCurrent, isCancelled } = getStepStatus(step.key, currentStatus, deliveryStatus);
        // Find timestamp from props if it exists
        const timelineEvent = timeline.find(t => t.status === step.key);

        return {
            ...step,
            isCompleted,
            isCurrent,
            isCancelled,
            date: timelineEvent ? new Date(timelineEvent.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : undefined
        };
    });

    if (currentStatus.toLowerCase() === 'cancelled') {
        return (
            <CancelledMessage>
                This order has been cancelled.
            </CancelledMessage>
        );
    }

    return (
        <TrackerContainer>
            {timelineSteps.map((step, index) => (
                <Step key={step.key} $isLast={index === timelineSteps.length - 1}>
                    <IconWrapper $active={step.isCompleted || step.isCurrent}>
                        {step.isCompleted ? <FaCheck size={10} /> : <Circle />}
                    </IconWrapper>
                    <Label $active={step.isCompleted || step.isCurrent}>{step.label}</Label>
                    {step.date && <DateText>{step.date}</DateText>}
                    {index !== timelineSteps.length - 1 && (
                        <Line $active={step.isCompleted} />
                    )}
                </Step>
            ))}
        </TrackerContainer>
    );
};

export default OrderTracker;

const TrackerContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  width: 100%;
  margin: 2rem 0;
  padding: 0 1rem;
`;

const Step = styled.div<{ $isLast: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  
  ${props => props.$isLast && `
    flex: 0 0 auto;
  `}
`;

const IconWrapper = styled.div<{ $active: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.$active ? '#2874f0' : '#fff'};
  border: 2px solid ${props => props.$active ? '#2874f0' : '#dcdcdc'};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
`;

const Circle = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #dcdcdc;
`;

const Line = styled.div<{ $active: boolean }>`
  position: absolute;
  top: 10px; /* Center of the icon (24px / 2) - half line height (2px) */
  left: 50%;
  width: 100%;
  height: 3px;
  background-color: ${props => props.$active ? '#2874f0' : '#dcdcdc'};
  z-index: 1;
  transition: background-color 0.3s ease;
`;

const Label = styled.div<{ $active: boolean }>`
  font-size: 0.85rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  color: ${props => props.$active ? '#212121' : '#878787'};
  text-align: center;
`;

const DateText = styled.div`
    font-size: 0.75rem;
    color: #878787;
    margin-top: 0.25rem;
`;

const CancelledMessage = styled.div`
    color: #ef4444;
    font-weight: 600;
    padding: 1rem;
    text-align: center;
    background: #fef2f2;
    border-radius: 8px;
    margin-bottom: 1rem;
`;
