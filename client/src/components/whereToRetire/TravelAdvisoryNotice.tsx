import './TravelAdvisoryNotice.scss'

export function TravelAdvisoryNotice() {
  return (
    <div className="wtr-travel-advisory" role="note">
      <p className="wtr-travel-advisory__text">
        The US State Department has issued a travel advisory for this destination. Review
        current conditions before planning a move.{' '}
        <a
          href="https://travel.state.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="wtr-travel-advisory__link"
        >
          travel.state.gov
        </a>
      </p>
    </div>
  )
}
