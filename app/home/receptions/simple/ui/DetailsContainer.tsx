import React from 'react';

interface DetailsContainerProps {
  cards: React.ReactNode[];
  numbered?: boolean;
}

export const DetailsContainer: React.FC<DetailsContainerProps> = ({ cards, numbered = false }) => {
  const renderedCards = cards.map((card, index) => {
    const key = index;
    const content = numbered && React.isValidElement(card)
      ? React.cloneElement(card, { packNumber: index + 1 } as any)
      : card;

    return (
      <div key={key} className="flex w-full">
        {content}
      </div>
    );
  });

  return (
    <div className="grid gap-4 w-full" data-test-id="details-container">
      {renderedCards}
    </div>
  );
};