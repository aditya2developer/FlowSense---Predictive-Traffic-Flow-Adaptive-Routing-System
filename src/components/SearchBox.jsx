function SearchBox({
  from,
  to,
  setFrom,
  setTo,
  onSearch
}) {

  return (
    <section className="search-box">

      <div className="input-group">

        <label>From</label>

        <input
          type="text"
          placeholder="Enter starting location"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />

      </div>


      <div className="input-group">

        <label>To</label>

        <input
          type="text"
          placeholder="Enter destination"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

      </div>


      <button
        className="search-button"
        onClick={onSearch}
      >
        🔍 Find Best Route
      </button>

    </section>
  );
}

export default SearchBox;