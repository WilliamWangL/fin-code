package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.DataVersion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DataVersionRepository extends JpaRepository<DataVersion, Long> {

    Optional<DataVersion> findByDatasetAndVersion(String dataset, String version);

    List<DataVersion> findByDataset(String dataset);
}
